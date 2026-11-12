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
