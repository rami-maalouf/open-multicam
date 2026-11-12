package expo.modules.multicamcapture

import android.content.Context
import android.graphics.SurfaceTexture
import android.hardware.camera2.*
import android.hardware.camera2.params.OutputConfiguration
import android.hardware.camera2.params.SessionConfiguration
import android.os.Build
import android.media.MediaCodecInfo
import android.media.MediaCodecList
import android.media.MediaFormat
import android.util.Size
import android.view.Surface
import java.util.concurrent.Executor
import kotlin.math.atan

internal class CaptureDiscovery(context: Context) {
  val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
  val size = Size(1920, 1080)
  fun characteristics(id: String) = manager.getCameraCharacteristics(id)
  fun position(id: String): String = when (characteristics(id)[CameraCharacteristics.LENS_FACING]) {
    CameraCharacteristics.LENS_FACING_BACK -> "back"
    CameraCharacteristics.LENS_FACING_FRONT -> "front"
    else -> "unspecified"
  }
  fun camera(id: String): Payload {
    val c = characteristics(id)
    val focal = c[CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS]?.firstOrNull() ?: 0f
    val physical = c[CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE]
    val fov = if (physical != null && focal > 0) Math.toDegrees(2 * atan(physical.width / (2.0 * focal))) else 0.0
    val type = when {
      c[CameraCharacteristics.LENS_FACING] == CameraCharacteristics.LENS_FACING_EXTERNAL -> "external"
      fov > 95 -> "ultra-wide"
      fov in 1.0..45.0 -> "telephoto"
      else -> "wide"
    }
    val label = "${position(id).replaceFirstChar { it.uppercase() }} ${type.replace('-', ' ')} camera ($id)"
    return mapOf("id" to id, "label" to label, "position" to position(id), "deviceType" to type,
      "fieldOfViewDegrees" to fov,
      "zoomRange" to mapOf("minimum" to 1, "maximum" to (c[CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM] ?: 1f)),
      "supportsFocusPoint" to ((c[CameraCharacteristics.CONTROL_MAX_REGIONS_AF] ?: 0) > 0),
      "supportsExposurePoint" to ((c[CameraCharacteristics.CONTROL_MAX_REGIONS_AE] ?: 0) > 0),
      "supportsTorch" to (c[CameraCharacteristics.FLASH_INFO_AVAILABLE] == true))
  }
  fun rates(id: String): List<Int> {
    val c = characteristics(id)
    val streams = c[CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP] ?: return emptyList()
    if (streams.getOutputSizes(SurfaceTexture::class.java)?.contains(size) != true) return emptyList()
    val ranges = c[CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES].orEmpty()
    return CaptureRules.rates(ranges.map { it.lower to it.upper }, streams.getOutputMinFrameDuration(SurfaceTexture::class.java, size))
  }
  fun stabilization(ids: List<String>): String = if (ids.all {
      characteristics(it)[CameraCharacteristics.CONTROL_AVAILABLE_VIDEO_STABILIZATION_MODES]
        ?.contains(CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE_ON) == true
    }) "standard" else "off"

  fun concurrent(ids: List<String>): Boolean {
    if (Build.VERSION.SDK_INT < 30) return false
    if (!manager.concurrentCameraIds.any { it.containsAll(ids) }) return false
    val textures = ids.map { SurfaceTexture(false).apply { setDefaultBufferSize(1920, 1080) } }
    val surfaces = textures.map { Surface(it) }
    return try {
      val configs = ids.mapIndexed { index, id -> id to SessionConfiguration(
        SessionConfiguration.SESSION_REGULAR, listOf(OutputConfiguration(surfaces[index])),
        Executor { it.run() }, object : CameraCaptureSession.StateCallback() {
          override fun onConfigured(session: CameraCaptureSession) {}
          override fun onConfigureFailed(session: CameraCaptureSession) {}
        }) }.toMap()
      manager.isConcurrentSessionConfigurationSupported(configs)
    } catch (_: Exception) { false }
    finally { surfaces.forEach { it.release() }; textures.forEach { it.release() } }
  }
  private val encoders by lazy {
    MediaCodecList(MediaCodecList.REGULAR_CODECS).codecInfos.filter { it.isEncoder && it.supportedTypes.any { type -> type.equals(MediaFormat.MIMETYPE_VIDEO_AVC, true) } }
  }
  private fun encoderBitrate(rate: Int, discrete: Boolean): Int? = encoders.mapNotNull { codec ->
    runCatching {
      val capabilities = codec.getCapabilitiesForType(MediaFormat.MIMETYPE_VIDEO_AVC)
      val video = capabilities.videoCapabilities
      if (!capabilities.colorFormats.contains(MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface) ||
        (discrete && capabilities.maxSupportedInstances < 2) ||
        !video.areSizeAndRateSupported(1920, 1080, rate.toDouble()) ||
        !video.areSizeAndRateSupported(1080, 1920, rate.toDouble())) null
      else video.bitrateRange.clamp(if (discrete) 12_000_000 else 16_000_000)
    }.getOrNull()
  }.maxOrNull()
  fun configurations(): List<Payload> {
    val ids = manager.cameraIdList.sortedWith(compareBy({ if (position(it) == "back") 0 else 1 }, { it }))
    val configs = mutableListOf<Payload>()
    fun add(mode: String, cameras: List<String>, rates: List<Int>, recommended: Boolean) {
      val supportedRates = rates.filter { encoderBitrate(it, mode == "discrete") != null }
      if (supportedRates.isEmpty()) return
      configs += mapOf("kind" to "supported", "id" to "$mode:${cameras.joinToString(":")}",
        "mode" to mode, "output" to when(mode) { "single" -> "single-file"; "discrete" -> "dual-files"; else -> "composite-file" },
        "cameraIds" to cameras, "frameRates" to supportedRates, "availability" to if (recommended) "recommended" else "available",
        "profile" to "core1080p", "codec" to "h264", "bitrate" to supportedRates.mapNotNull { encoderBitrate(it, mode == "discrete") }.min(),
        "stabilization" to stabilization(cameras), "estimatedHardwareCost" to if (mode == "single") .45 else .84)
    }
    for (a in ids.indices) for (b in a + 1 until ids.size) {
      val pair = listOf(ids[a], ids[b])
      val rates = rates(pair[0]).intersect(rates(pair[1]).toSet()).sorted()
      if (rates.isEmpty() || !concurrent(pair)) continue
      val frontBack = pair.map { position(it) }.toSet() == setOf("front", "back")
      if (frontBack) add("pip", pair, rates, true)
      add("split", pair, rates, !frontBack)
      add("discrete", pair, rates, false)
    }
    ids.forEach { add("single", listOf(it), rates(it), position(it) == "back") }
    return configs
  }
  fun capabilities(): Payload {
    val configs = configurations()
    val cameras = manager.cameraIdList.map { camera(it) }
    val dual = configs.any { it["mode"] != "single" }
    val result = mutableMapOf<String, Any?>("kind" to "device-capabilities", "schemaVersion" to 1,
      "discoveredAtMs" to System.currentTimeMillis(), "isSimulator" to (Build.FINGERPRINT.startsWith("generic") || Build.MODEL.contains("Emulator")),
      "cameras" to cameras, "configurations" to configs,
      "multicam" to if (dual) mapOf("kind" to "supported") else mapOf("kind" to "unsupported", "reason" to mapOf(
        "kind" to if (cameras.isEmpty()) "camera-unavailable" else "multicam-unsupported",
        "message" to if (cameras.isEmpty()) "No camera is available on this device." else "This device does not expose concurrent full-HD cameras.")))
    configs.firstOrNull()?.let { result["recommendedConfigurationId"] = it["id"] }
    return result
  }
  fun resolve(request: Payload): Preset {
    val id = request["configurationId"] as? String ?: invalidRequest()
    val config = configurations().firstOrNull { it["id"] == id } ?: unavailable()
    val ids = listOfNotNull(request["cameraAId"] as? String, request["cameraBId"] as? String)
    val rate = (request["frameRate"] as? Number)?.toDouble() ?: invalidRequest()
    val orientation = request["orientation"] as? String ?: invalidRequest()
    if (orientation !in listOf("portrait", "landscape") || rate != rate.toInt().toDouble()) invalidRequest()
    if (request["mode"] != config["mode"] || request["output"] != config["output"] ||
      ids.size != ids.distinct().size || ids.toSet() != (config["cameraIds"] as List<*>).toSet() ||
      !(config["frameRates"] as List<*>).contains(rate.toInt())) unavailable()
    return Preset(id, config["mode"] as String, config["output"] as String, ids, orientation, rate.toInt(), config["stabilization"] as String, (config["bitrate"] as Number).toInt())
  }
}
