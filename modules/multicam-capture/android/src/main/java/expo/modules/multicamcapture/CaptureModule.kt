package expo.modules.multicamcapture

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.WeakHashMap

internal object CaptureEngines {
  private val engines = WeakHashMap<AppContext, CaptureEngine>()
  @Synchronized fun get(appContext: AppContext): CaptureEngine = engines.getOrPut(appContext) {
    CaptureEngine(requireNotNull(appContext.reactContext).applicationContext)
  }
  @Synchronized fun remove(appContext: AppContext) { engines.remove(appContext)?.destroy() }
}

class CaptureModule : Module() {
  private val engine get() = CaptureEngines.get(appContext)
  override fun definition() = ModuleDefinition {
    Name("MulticamCapture")
    Events("onCaptureEvent")
    OnCreate { engine.emit = { sendEvent("onCaptureEvent", it) } }
    AsyncFunction("getPermissionStatus") { promise: Promise -> permissions(promise) }
    AsyncFunction("requestCameraPermission") { promise: Promise -> request(Manifest.permission.CAMERA, promise) }
    AsyncFunction("requestMicrophonePermission") { promise: Promise -> request(Manifest.permission.RECORD_AUDIO, promise) }
    AsyncFunction("openSettings") {
      val context = requireNotNull(appContext.reactContext)
      runCatching {
        context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
      }.getOrDefault(false)
    }
    AsyncFunction("discoverCapabilities") { promise: Promise -> run(promise) { engine.discovery.capabilities() } }
    AsyncFunction("configure") { request: Map<String, Any?>, promise: Promise -> run(promise) { engine.configure(request) } }
    AsyncFunction("startRecording") { promise: Promise -> run(promise) { engine.start() } }
    AsyncFunction("stopRecording") { promise: Promise -> run(promise) { engine.stop() } }
    AsyncFunction("listRecordings") { promise: Promise -> run(promise) { engine.storage.list() } }
    AsyncFunction("deleteRecording") { id: String, promise: Promise -> run(promise) { engine.storage.delete(id) } }
    AsyncFunction("renameRecording") { id: String, name: String, promise: Promise -> run(promise) { engine.storage.rename(id, name) } }
    View(CaptureSurfaceView::class) {}
    OnActivityEntersBackground { engine.interrupt("backgrounded") }
    OnDestroy { CaptureEngines.remove(appContext) }
  }
  private fun run(promise: Promise, block: () -> Any) {
    engine.execute {
      try { promise.resolve(block()) }
      catch (error: Throwable) { promise.reject("ERR_CAPTURE", error.message, error) }
    }
  }
  private fun permissions(promise: Promise) {
    val manager = appContext.permissions
    if (manager == null) { promise.reject("ERR_PERMISSIONS", "The permission service is unavailable.", null); return }
    manager.getPermissions({ result ->
      fun status(permission: String) = when (result[permission]?.status) {
        PermissionsStatus.GRANTED -> "authorized"
        PermissionsStatus.UNDETERMINED -> "not-determined"
        else -> "denied"
      }
      promise.resolve(mapOf("kind" to "capture-permissions", "camera" to status(Manifest.permission.CAMERA), "microphone" to status(Manifest.permission.RECORD_AUDIO)))
    }, Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
  }
  private fun request(permission: String, promise: Promise) {
    val manager = appContext.permissions
    if (manager == null) { promise.reject("ERR_PERMISSIONS", "The permission service is unavailable.", null); return }
    manager.askForPermissions({ permissions(promise) }, permission)
  }
}
