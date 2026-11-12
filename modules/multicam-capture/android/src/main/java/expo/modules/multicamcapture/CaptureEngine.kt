package expo.modules.multicamcapture

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Rect
import android.graphics.RectF
import android.hardware.camera2.*
import android.hardware.camera2.params.MeteringRectangle
import android.hardware.display.DisplayManager
import android.os.*
import android.util.Range
import android.view.Display
import android.view.Surface
import java.util.UUID
import java.util.concurrent.*

internal class CaptureEngine(val context: Context) {
  val discovery = CaptureDiscovery(context)
  val storage = CaptureStorage(context, discovery)
  private val thread = HandlerThread("multicam-camera").apply { start() }
  val handler = Handler(thread.looper)
  private val operations = Executors.newSingleThreadExecutor()
  private var renderer: CaptureRenderer? = null
  private val devices = mutableListOf<CameraDevice>()
  private val sessions = mutableListOf<CameraCaptureSession>()
  private val requests = mutableListOf<CaptureRequest.Builder>()
  // read from the ui thread during a pinch, so it never waits on the camera thread
  @Volatile private var zooms = floatArrayOf()
  @Volatile private var generation = 0
  @Volatile var preset: Preset? = null
    private set
  @Volatile var state = "idle"
    private set
  @Volatile var swapped = false
    private set
  @Volatile var corner = 1
    private set
  private var pipAnimation: Runnable? = null
  private var sequence = 0L
  private var recording: CaptureStorage.Recording? = null
  private var recorder: CaptureRecorder? = null
  private var startedAt = 0L
  private var elapsedStart = 0L
  private val failures = FailureGate()
  @Volatile private var closed = false
  var emit: ((Payload) -> Unit)? = null
  private var previewSurface: Surface? = null
  private var previewWidth = 0
  private var previewHeight = 0
  private var deviceRotation = 0
  private var thermalListener: PowerManager.OnThermalStatusChangedListener? = null
  private val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
  private val displays = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
  private val displayListener = object : DisplayManager.DisplayListener {
    override fun onDisplayAdded(displayId: Int) {}
    override fun onDisplayRemoved(displayId: Int) {}
    // turning straight from one landscape to the other changes no layout, so js never reconfigures
    override fun onDisplayChanged(displayId: Int) {
      val p = preset ?: return
      if (displayId != Display.DEFAULT_DISPLAY) return
      val rotation = CaptureRules.deviceRotation(p.orientation, displayRotation())
      if (rotation == deviceRotation) return
      deviceRotation = rotation
      renderer?.rotate(p.cameraIds.map { feedRotation(it) })
    }
  }

  init {
    if (Build.VERSION.SDK_INT >= 29) {
      val listener = PowerManager.OnThermalStatusChangedListener { status ->
        if (status >= PowerManager.THERMAL_STATUS_CRITICAL) interrupt("system-pressure-critical")
      }
      thermalListener = listener; power.addThermalStatusListener(listener)
    }
    displays.registerDisplayListener(displayListener, handler)
  }
  fun execute(block: () -> Unit) { if (!closed) operations.execute(block) }
  private fun <T> camera(block: () -> T): T {
    if (Looper.myLooper() == handler.looper) return block()
    val task = FutureTask(Callable { block() }); check(handler.post(task))
    return task.get(15, TimeUnit.SECONDS)
  }
  private fun publish(kind: String, details: Payload = emptyMap()) {
    state = kind
    val payload = mapOf("kind" to kind) + details
    emit?.invoke(mapOf("kind" to "state-changed", "sequence" to ++sequence, "state" to payload))
  }
  private fun thermalCritical() = Build.VERSION.SDK_INT >= 29 && power.currentThermalStatus >= PowerManager.THERMAL_STATUS_CRITICAL
  private fun displayRotation(): Int = when (displays.getDisplay(Display.DEFAULT_DISPLAY)?.rotation) {
    Surface.ROTATION_90 -> 90; Surface.ROTATION_180 -> 180; Surface.ROTATION_270 -> 270; else -> 0
  }
  private fun feedRotation(id: String): Int = CaptureRules.feedRotation(
    discovery.characteristics(id)[CameraCharacteristics.SENSOR_ORIENTATION] ?: 0, deviceRotation, discovery.position(id) == "front")
  fun result(block: () -> Any): Payload = try { success(block()) }
    catch (error: Throwable) {
      val cause = if (error is ExecutionException) error.cause ?: error else error
      val failure = cause as? CaptureFailure ?: CaptureFailure(when (state) {
        "configuring" -> "preview_unavailable"; "preparing", "ready", "starting" -> "recording_start_failed"
        "stopping", "finalizing" -> "finalization_failed"; else -> "internal_failure"
      }, when (state) {
        "configuring" -> "The camera session could not be prepared."
        "preparing", "ready", "starting" -> "The recording could not be started."
        "stopping", "finalizing" -> "The recording could not be finalized safely."
        else -> "The camera operation failed."
      })
      if (failure.code != "invalid_state_transition") {
        handler.removeCallbacks(progress)
        val pending = recording
        val frames = runCatching { camera { renderer?.encodedFrames ?: 0L } }.getOrDefault(1L)
        runCatching { camera { renderer?.stopEncoding(); closeCameras() } }
        recorder?.release(); recorder = null
        // a take that failed to start, or stopped before its first frame, has nothing to recover
        val empty = state in listOf("preparing", "ready", "starting") || frames == 0L
        if (pending != null && empty) storage.discard(pending) else storage.abandon()
        recording = null
        publish("failed", mapOf("error" to failure.payload()) + if (pending != null) mapOf("recordingSetId" to pending.id) else emptyMap())
      }
      failure.result()
    }
  fun configure(request: Payload): Payload = result {
    if (state !in listOf("idle", "previewing", "completed", "interrupted", "recoverable", "failed")) invalidState()
    if (state != "idle" && state != "previewing") publish("idle")
    publish("configuring", mapOf("requestId" to (request["configurationId"] ?: UUID.randomUUID().toString())))
    if (context.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
      throw CaptureFailure("camera_permission_denied", "Allow camera access in Settings.", "open-settings")
    if (thermalCritical())
      throw CaptureFailure("thermal_state_critical", "The device is too warm to use the cameras. Let it cool down, then try again.", "wait-for-device")
    val resolved = discovery.resolve(request)
    val ready = CompletableFuture<Unit>()
    camera {
      pipAnimation?.let { handler.removeCallbacks(it) }; pipAnimation = null
      closeCameras()
      if (renderer == null) renderer = CaptureRenderer(handler) { cameraFailure("writer-failed", generation) }
      val target = renderer!!
      target.clearFeeds(); target.preset = resolved; target.swapped = false; target.corner = 1; target.draggedInset = null
      target.attachPreview(previewSurface, previewWidth, previewHeight)
      preset = resolved; swapped = false; corner = 1; recording = null
      zooms = FloatArray(resolved.cameraIds.size) { 1f }
      deviceRotation = CaptureRules.deviceRotation(resolved.orientation, displayRotation())
      val token = generation
      val outputs = resolved.cameraIds.map { id -> target.createFeed(feedRotation(id), discovery.position(id) == "front") }
      var configured = 0
      val opened = mutableMapOf<String, CameraDevice>()
      fun createSessions() {
        resolved.cameraIds.forEachIndexed { index, id ->
          val device = opened.getValue(id)
          @Suppress("DEPRECATION")
          device.createCaptureSession(listOf(outputs[index]), object : CameraCaptureSession.StateCallback() {
            override fun onConfigured(session: CameraCaptureSession) {
              if (token != generation) { session.close(); return }
              try {
                val builder = device.createCaptureRequest(CameraDevice.TEMPLATE_RECORD)
                builder.addTarget(outputs[index]); builder.set(CaptureRequest.CONTROL_MODE, CaptureRequest.CONTROL_MODE_AUTO)
                builder.set(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, Range(resolved.frameRate, resolved.frameRate))
                val af = (discovery.characteristics(id)[CameraCharacteristics.CONTROL_AF_AVAILABLE_MODES] ?: intArrayOf())
                if (af.contains(CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_VIDEO)) builder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_VIDEO)
                builder.set(CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE, if (resolved.stabilization == "standard") CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE_ON else CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE_OFF)
                // sessions are appended in callback order; every lookup goes through the device id.
                sessions += session; requests += builder
                session.setRepeatingRequest(builder.build(), null, handler)
                configured++
                if (configured == resolved.cameraIds.size) ready.complete(Unit)
              } catch (error: Throwable) { ready.completeExceptionally(error) }
            }
            override fun onConfigureFailed(session: CameraCaptureSession) { session.close(); ready.completeExceptionally(IllegalStateException("Camera session rejected.")) }
          }, handler)
        }
      }
      resolved.cameraIds.forEach { id ->
        discovery.manager.openCamera(id, object : CameraDevice.StateCallback() {
          override fun onOpened(device: CameraDevice) {
            if (token != generation) { device.close(); return }
            devices += device; opened[id] = device
            // concurrent devices must all be opened before any session is configured.
            if (opened.size == resolved.cameraIds.size) {
              try { createSessions() } catch (error: Throwable) { ready.completeExceptionally(error) }
            }
          }
          override fun onDisconnected(device: CameraDevice) {
            device.close(); ready.completeExceptionally(IllegalStateException("Camera disconnected."))
            cameraFailure("media-services-reset", token)
          }
          override fun onError(device: CameraDevice, error: Int) {
            device.close(); ready.completeExceptionally(IllegalStateException("Camera error $error."))
            cameraFailure("media-services-reset", token)
          }
        }, handler)
      }
    }
    ready.get(15, TimeUnit.SECONDS)
    publish("previewing", mapOf("preset" to resolved.payload()))
    resolved.payload()
  }
  fun start(): Payload = result {
    if (state != "previewing") invalidState()
    if (context.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
      throw CaptureFailure("camera_permission_denied", "Allow camera access in Settings.", "open-settings")
    if (thermalCritical()) throw CaptureFailure("thermal_state_critical", "The device is too warm to record. Let it cool down, then try again.", "wait-for-device")
    val p = preset ?: invalidState()
    val id = UUID.randomUUID().toString()
    val token = generation
    publish("preparing", mapOf("recordingSetId" to id, "preset" to p.payload()))
    val audio = context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    val pending = storage.prepare(id, p, audio); recording = pending
    val writer = CaptureRecorder(context, p, pending, audio) { cameraFailure("writer-failed", token) }; recorder = writer
    val surfaces = writer.prepare()
    publish("ready", mapOf("recordingSetId" to id, "preset" to p.payload()))
    publish("starting", mapOf("recordingSetId" to id, "preset" to p.payload()))
    camera { writer.start(); renderer!!.startEncoding(surfaces) }
    startedAt = System.currentTimeMillis()
    elapsedStart = SystemClock.elapsedRealtime()
    publish("recording", mapOf("recordingSetId" to id, "preset" to p.payload(), "startedAtMs" to startedAt))
    handler.post(progress)
    mapOf("recordingSetId" to id)
  }
  fun stop(reason: String = "user-requested"): Payload = result {
    if (state != "recording") invalidState()
    val pending = recording ?: invalidState()
    val p = preset ?: invalidState()
    publish("stopping", mapOf("recordingSetId" to pending.id, "reason" to reason))
    handler.removeCallbacks(progress)
    val timing = camera { renderer!!.stopEncoding(); renderer!!.firstFrameNs to renderer!!.encodedFrames }
    publish("finalizing", mapOf("recordingSetId" to pending.id))
    recorder!!.stop(); recorder = null
    check(timing.second > 0) { "No complete video frame was recorded." }
    val manifest = storage.finalize(pending, p, timing.first / 1_000_000_000.0, swapped, corner)
    val duration = ((manifest["outcome"] as Map<*, *>)["durationMs"] as Number).toLong()
    // js tells the viewer why a take it did not stop has ended, for example a device that is too warm
    publish("completed", mapOf("recordingSetId" to pending.id, "durationMs" to duration) +
      if (reason != "user-requested") mapOf("reason" to reason) else emptyMap())
    recording = null
    manifest
  }
  private val progress = object : Runnable {
    override fun run() {
      if (state != "recording") return
      execute {
        if (state == "recording") {
          val free = storage.freeBytes
          emit?.invoke(mapOf("kind" to "recording-progress", "sequence" to ++sequence, "recordingSetId" to recording?.id,
            "elapsedMs" to SystemClock.elapsedRealtime() - elapsedStart, "droppedFrameCount" to camera { renderer?.droppedFrames ?: 0L }, "freeStorageBytes" to free))
          val remux = recording?.takeIf { preset?.mode == "discrete" }?.clips?.getOrNull(1)?.file?.let { CaptureRules.remuxReserveBytes(it.length()) } ?: 0L
          if (CaptureRules.storageCritical(free, remux)) stop("storage-critical")
        }
      }
      handler.postDelayed(this, 500)
    }
  }
  private fun cameraFailure(reason: String, token: Int) {
    if (closed || !failures.admit(token, generation)) return
    execute {
      if (token != generation) return@execute
      if (state == "recording") stop(reason)
      else if (state !in listOf("configuring", "idle", "completed", "failed", "interrupted")) {
        publish("interrupted", mapOf("reason" to reason, "recoverable" to false))
      }
      runCatching { camera { if (token == generation) closeCameras() } }
    }
  }
  fun interrupt(reason: String) { execute {
    if (state == "recording") stop(reason)
    else if (state == "previewing") publish("interrupted", mapOf("reason" to reason, "recoverable" to false))
    runCatching { camera { closeCameras() } }
  } }
  fun attach(surface: Surface?, width: Int, height: Int) {
    handler.post {
      previewSurface = surface; previewWidth = width; previewHeight = height
      runCatching { renderer?.attachPreview(surface, width, height) }
    }
  }
  // returns false when the camera thread did not let go in time; the view then releases the surface later
  fun detach(surface: Surface?): Boolean {
    if (closed) return true
    val task = FutureTask(Callable {
      if (previewSurface === surface) {
        runCatching { renderer?.attachPreview(null, 0, 0) }
        previewSurface = null
      }
    })
    if (!handler.post(task)) return true
    val detached = runCatching { task.get(2, TimeUnit.SECONDS) }.isSuccess
    // without a preview the cameras would keep streaming, with the privacy indicator on, while the viewer is elsewhere
    execute {
      if (state == "previewing" && runCatching { camera { previewSurface == null } }.getOrDefault(false)) {
        publish("interrupted", mapOf("reason" to "backgrounded", "recoverable" to true))
        runCatching { camera { closeCameras() } }
      }
    }
    return detached
  }
  fun dragPip(frame: RectF?) { handler.post {
    pipAnimation?.let { handler.removeCallbacks(it) }; pipAnimation = null
    renderer?.draggedInset = frame
  } }
  fun swap() { handler.post {
    if (preset?.mode in listOf("pip", "split")) { swapped = !swapped; renderer?.swapped = swapped }
  } }
  fun movePip(value: Int) { handler.post {
    val p = preset ?: return@post
    val targetRenderer = renderer ?: return@post
    pipAnimation?.let { handler.removeCallbacks(it) }
    fun normalized(corner: Int): RectF = PipLayout.frame(p.width.toFloat(), p.height.toFloat(), corner).let {
      RectF(it.left / p.width, it.top / p.height, it.right / p.width, it.bottom / p.height)
    }
    val from = targetRenderer.draggedInset ?: normalized(corner)
    corner = value.coerceIn(0, 3); targetRenderer.corner = corner
    val to = normalized(corner)
    val started = SystemClock.elapsedRealtime()
    val animation = object : Runnable {
      override fun run() {
        val t = ((SystemClock.elapsedRealtime() - started) / 400f).coerceAtMost(1f)
        if (t >= 1f) { targetRenderer.draggedInset = null; pipAnimation = null; return }
        val amount = (1 - kotlin.math.exp(-7.0 * t) * kotlin.math.cos(10.0 * t)).toFloat()
        targetRenderer.draggedInset = RectF(from.left + (to.left - from.left) * amount,
          from.top + (to.top - from.top) * amount, from.right + (to.right - from.right) * amount,
          from.bottom + (to.bottom - from.bottom) * amount)
        handler.postDelayed(this, 16)
      }
    }
    pipAnimation = animation; animation.run()
  } }
  fun zoom(slot: Int, factor: Float) { handler.post {
    val p = preset ?: return@post
    val id = p.cameraIds.getOrNull(slot) ?: return@post
    val sessionIndex = sessions.indexOfFirst { it.device.id == id }
    val builder = requests.getOrNull(sessionIndex) ?: return@post
    val c = discovery.characteristics(id)
    val sensor = c[CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE] ?: return@post
    if (!factor.isFinite()) return@post
    val zoom = factor.coerceIn(1f, c[CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM] ?: 1f)
    zooms = zooms.copyOf().also { if (slot < it.size) it[slot] = zoom }
    val w = (sensor.width() / zoom).toInt(); val h = (sensor.height() / zoom).toInt()
    builder.set(CaptureRequest.SCALER_CROP_REGION, Rect(sensor.centerX() - w / 2, sensor.centerY() - h / 2, sensor.centerX() + w / 2, sensor.centerY() + h / 2))
    runCatching { sessions[sessionIndex].setRepeatingRequest(builder.build(), null, handler) }
  } }
  fun zoomFactor(slot: Int): Float = zooms.getOrNull(slot) ?: 1f
  fun focus(slot: Int, x: Float, y: Float, paneAspect: Float) { handler.post {
    val p = preset ?: return@post
    val id = p.cameraIds.getOrNull(slot) ?: return@post
    val index = sessions.indexOfFirst { it.device.id == id }
    val builder = requests.getOrNull(index) ?: return@post
    val c = discovery.characteristics(id)
    val crop = builder.get(CaptureRequest.SCALER_CROP_REGION) ?: c[CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE] ?: return@post
    // camera2 center-crops the sensor region again to the stream aspect ratio.
    val streamWidth = minOf(crop.width(), crop.height() * 16 / 9)
    val streamHeight = minOf(crop.height(), crop.width() * 9 / 16)
    val sensor = Rect(crop.centerX() - streamWidth / 2, crop.centerY() - streamHeight / 2,
      crop.centerX() + streamWidth / 2, crop.centerY() + streamHeight / 2)
    val front = discovery.position(id) == "front"
    val rotation = feedRotation(id)
    val sourceAspect = if (rotation % 180 == 0) 1920f / 1080 else 1080f / 1920
    val nx = .5f + (x - .5f) * minOf(1f, paneAspect / sourceAspect)
    val ny = .5f + (y - .5f) * minOf(1f, sourceAspect / paneAspect)
    val px = if (front) 1 - nx else nx
    val point = when(rotation) { 90 -> ny to 1 - px; 180 -> 1 - px to 1 - ny; 270 -> 1 - ny to px; else -> px to ny }
    val size = maxOf(1, minOf(sensor.width(), sensor.height()) / 12)
    val cx = (sensor.left + point.first.coerceIn(0f, 1f) * sensor.width()).toInt().coerceIn(sensor.left, sensor.right - size)
    val cy = (sensor.top + point.second.coerceIn(0f, 1f) * sensor.height()).toInt().coerceIn(sensor.top, sensor.bottom - size)
    val region = arrayOf(MeteringRectangle(Rect(cx, cy, cx + size, cy + size), MeteringRectangle.METERING_WEIGHT_MAX))
    val canFocus = (c[CameraCharacteristics.CONTROL_MAX_REGIONS_AF] ?: 0) > 0 &&
      c[CameraCharacteristics.CONTROL_AF_AVAILABLE_MODES]?.contains(CaptureRequest.CONTROL_AF_MODE_AUTO) == true
    if (canFocus) {
      builder.set(CaptureRequest.CONTROL_AF_REGIONS, region); builder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_AUTO)
    }
    if ((c[CameraCharacteristics.CONTROL_MAX_REGIONS_AE] ?: 0) > 0) builder.set(CaptureRequest.CONTROL_AE_REGIONS, region)
    runCatching {
      if (canFocus) builder.set(CaptureRequest.CONTROL_AF_TRIGGER, CaptureRequest.CONTROL_AF_TRIGGER_START)
      sessions[index].capture(builder.build(), null, handler)
      builder.set(CaptureRequest.CONTROL_AF_TRIGGER, CaptureRequest.CONTROL_AF_TRIGGER_IDLE)
      sessions[index].setRepeatingRequest(builder.build(), null, handler)
    }
  } }
  private fun closeCameras() {
    generation++
    sessions.forEach { runCatching { it.close() } }; sessions.clear(); requests.clear()
    devices.forEach { runCatching { it.close() } }; devices.clear()
  }
  fun destroy() { execute {
    try {
      if (state == "recording") stop("backgrounded")
      handler.removeCallbacks(progress)
      runCatching { camera { closeCameras(); renderer?.close(); renderer = null } }
      recorder?.release(); recorder = null; storage.abandon()
      if (Build.VERSION.SDK_INT >= 29) thermalListener?.let { power.removeThermalStatusListener(it) }
      displays.unregisterDisplayListener(displayListener)
      publish("idle")
    } finally {
      emit = null; closed = true; thread.quitSafely(); operations.shutdown()
    }
  } }
}
