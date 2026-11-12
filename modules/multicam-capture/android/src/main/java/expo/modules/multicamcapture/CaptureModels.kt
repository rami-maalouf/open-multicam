package expo.modules.multicamcapture

import android.graphics.RectF
import java.util.UUID

internal typealias Payload = Map<String, Any?>

internal class CaptureFailure(
  val code: String,
  override val message: String,
  val action: String = "retry",
  val retryable: Boolean = true
) : Exception(message) {
  fun payload(): Payload = mapOf("kind" to "capture-error", "code" to code,
    "message" to message, "retryable" to retryable, "recoveryAction" to action)
  fun result(): Payload = mapOf("ok" to false, "error" to payload())
}

internal fun invalidState(): Nothing = throw CaptureFailure("invalid_state_transition", "The camera is not ready for that action.")
internal fun invalidRequest(): Nothing = throw CaptureFailure("invalid_request", "The capture request is incomplete or malformed.", "select-configuration", false)
internal fun unavailable(): Nothing = throw CaptureFailure("configuration_unavailable", "The selected camera configuration is unavailable.", "select-configuration")
internal fun success(value: Any): Payload = mapOf("ok" to true, "value" to value)

internal data class Preset(
  val configurationId: String, val mode: String, val output: String,
  val cameraIds: List<String>, val orientation: String, val frameRate: Int,
  val stabilization: String,
  val bitrate: Int = if (mode == "discrete") 12_000_000 else 16_000_000
) {
  val width get() = if (orientation == "portrait") 1080 else 1920
  val height get() = if (orientation == "portrait") 1920 else 1080
  fun media(): Payload = mapOf("profile" to "core1080p", "orientation" to orientation,
    "width" to width, "height" to height, "frameRate" to frameRate,
    "codec" to "h264", "bitrate" to bitrate, "stabilization" to stabilization)
  fun payload(): Payload = media() + mapOf("configurationId" to configurationId,
    "mode" to mode, "output" to output, "cameraAId" to cameraIds[0]) +
    if (cameraIds.size == 2) mapOf("cameraBId" to cameraIds[1]) else emptyMap()
}

internal object CaptureRules {
  fun rates(ranges: List<Pair<Int, Int>>, minimumDurationNs: Long): List<Int> =
    listOf(24, 25, 30).filter { rate ->
      ranges.any { it.first == rate && it.second == rate } &&
        (minimumDurationNs == 0L || minimumDurationNs <= 1_000_000_000L / rate + 1)
    }

  fun identifier(value: String): String {
    val normalized = value.lowercase()
    require(Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}").matches(normalized)) { "Invalid recording identifier." }
    return UUID.fromString(normalized).toString()
  }

  // js only sends portrait or landscape, so the display decides which way landscape is turned
  fun deviceRotation(orientation: String, displayRotationDegrees: Int): Int =
    if (orientation == "portrait") 0 else if (displayRotationDegrees == 270) 270 else 90

  fun feedRotation(sensorOrientation: Int, deviceRotation: Int, front: Boolean): Int =
    if (front) (sensorOrientation + deviceRotation) % 360 else (sensorOrientation - deviceRotation + 360) % 360

  const val storageReserveBytes = 50L * 1024 * 1024

  // a two-file take writes camera b again at stop to attach the microphone, so b's size stays reserved
  fun remuxReserveBytes(cameraBBytes: Long): Long = cameraBBytes + cameraBBytes / 20

  fun storageCritical(freeBytes: Long, remuxReserveBytes: Long): Boolean = freeBytes < storageReserveBytes + remuxReserveBytes

  // both encoders receive the same first frame, so camera a's microphone keeps its offset from a's first
  // video frame when it moves next to b's first video frame
  fun shiftedAudioTimeUs(audioUs: Long, firstVideoAUs: Long, firstVideoBUs: Long): Long = audioUs - firstVideoAUs + firstVideoBUs

  // a staging take left by a crash or a failed stop. playable clips become "recoverable" so the outcome
  // kind matches a clip status, as the shared manifest schema requires
  fun recovered(manifest: Payload, media: Map<String, Payload?>): Payload {
    val clips = (manifest["clips"] as List<*>).map { raw -> (raw as Map<*, *>).entries.associate { it.key as String to it.value } }
    val whole = (manifest["outcome"] as? Map<*, *>)?.get("kind") == "ready" && clips.all { media[it["id"] as String] != null }
    if (whole) return manifest
    val updated = clips.map { clip ->
      val validated = media[clip["id"] as String]
      clip + if (validated != null) mapOf("status" to "recoverable", "media" to validated, "issue" to "Recovered after the recording was interrupted.")
        else mapOf("status" to "corrupt", "media" to null, "issue" to "The interrupted file could not be decoded.")
    }
    val playable = updated.filter { it["media"] != null }.map { it["id"] }
    val warnings = (manifest["warnings"] as? List<*>).orEmpty() +
      mapOf("kind" to "recovery", "message" to "Recording was interrupted before finalization.")
    return manifest + mapOf("clips" to updated, "warnings" to warnings,
      "outcome" to if (playable.isNotEmpty()) mapOf("kind" to "recoverable", "reason" to "finalization-incomplete", "playableClipIds" to playable)
        else mapOf("kind" to "corrupt", "reason" to "unreadable-track"))
  }
}

// a camera failure belongs to the camera generation that raised it: one per generation is acted on,
// and a failure queued for an older generation must not tear down a session configured after it
internal class FailureGate {
  @Volatile private var failed = -1
  fun admit(token: Int, current: Int): Boolean {
    if (token != current || token == failed) return false
    failed = token
    return true
  }
}

internal object PipLayout {
  fun frame(width: Float, height: Float, corner: Int): RectF {
    val margin = minOf(width, height) * .04f
    val portrait = height >= width
    val aspect = if (portrait) 9f / 16 else 16f / 9
    var w = width * if (portrait) .36f else .30f
    var h = w / aspect
    if (h > height * .48f) { h = height * .48f; w = h * aspect }
    val x = if (corner % 2 == 0) margin else width - margin - w
    val y = if (corner < 2) margin else height - margin - h
    return RectF(x, y, x + w, y + h)
  }
}
