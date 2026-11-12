package expo.modules.multicamcapture

import android.content.Context
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

internal fun JSONObject.payload(): Payload = keys().asSequence().associateWith { key -> jsonValue(get(key)) }
private fun jsonValue(value: Any?): Any? = when (value) {
  JSONObject.NULL -> null
  is JSONObject -> value.payload()
  is JSONArray -> (0 until value.length()).map { jsonValue(value.get(it)) }
  else -> value
}

internal class CaptureStorage(context: Context, private val discovery: CaptureDiscovery) {
  private val root = File(context.filesDir, "OpenMulticam").apply { mkdirs() }
  private val staging = File(root, "Staging").apply { mkdirs() }
  private val library = File(root, "Recordings").apply { mkdirs() }
  data class Clip(val id: String, val role: String, val file: File)
  data class Recording(val id: String, val directory: File, val clips: List<Clip>, val manifest: MutableMap<String, Any?>)
  var activeId: String? = null
  val freeBytes get() = root.usableSpace

  @Synchronized fun prepare(id: String, preset: Preset, audio: Boolean): Recording {
    if (freeBytes < 100L * 1024 * 1024) throw CaptureFailure("storage_insufficient", "Free up storage before recording.", "free-storage")
    val directory = File(staging, CaptureRules.identifier(id))
    check(directory.mkdir()) { "Could not prepare the recording folder." }
    val roles = when (preset.mode) {
      "single" -> listOf("single" to "single.mp4")
      "discrete" -> listOf("cameraA" to "camera-a.mp4", "cameraB" to "camera-b.mp4")
      else -> listOf("composite" to "composite.mp4")
    }
    val clips = roles.map { Clip(UUID.randomUUID().toString(), it.first, File(directory, it.second)) }
    fun camera(id: String): Payload = discovery.camera(id).filterKeys { it in setOf("id", "label", "position") }
    val manifest = mutableMapOf<String, Any?>("kind" to "recording-set-manifest", "schemaVersion" to 1,
      "recordingSetId" to id, "name" to null, "createdAtUtcMs" to System.currentTimeMillis(),
      "startedAtPtsSeconds" to null, "preset" to preset.media(), "mode" to preset.mode,
      "cameraA" to camera(preset.cameraIds[0]), "warnings" to emptyList<Any>(),
      "audio" to if (audio) mapOf("kind" to "present", "route" to mapOf("label" to "Device microphone", "channelCount" to 1, "sampleRateHz" to 44100))
        else mapOf("kind" to "absent", "reason" to "permission-not-granted"),
      "outcome" to mapOf("kind" to "staging"),
      "clips" to clips.map { mapOf("id" to it.id, "role" to it.role, "relativePath" to it.file.name, "status" to "staging", "media" to null, "issue" to null) })
    if (preset.cameraIds.size == 2) manifest["cameraB"] = camera(preset.cameraIds[1])
    if (preset.mode == "pip") manifest["composition"] = composition(preset, false, 1)
    if (preset.mode == "split") manifest["composition"] = composition(preset, false, 1)
    write(directory, manifest)
    activeId = id
    return Recording(id, directory, clips, manifest)
  }
  private fun composition(p: Preset, swapped: Boolean, corner: Int): Payload {
    if (p.mode == "split") return mapOf("kind" to "split", "division" to "horizontal", "cameraAPlacement" to if (swapped) "trailing" else "leading")
    val r = PipLayout.frame(p.width.toFloat(), p.height.toFloat(), corner)
    return mapOf("kind" to "pip", "primaryCamera" to if (swapped) "B" else "A", "visible" to true,
      "inset" to mapOf("x" to r.left / p.width, "y" to r.top / p.height, "width" to r.width() / p.width, "height" to r.height() / p.height))
  }
  fun media(file: File): Payload {
    check(file.isFile && file.length() > 0) { "The recording file is missing." }
    val extractor = MediaExtractor()
    val retriever = MediaMetadataRetriever()
    try {
      extractor.setDataSource(file.path)
      val formats = (0 until extractor.trackCount).map { extractor.getTrackFormat(it) }
      val video = formats.filter { it.getString(MediaFormat.KEY_MIME)?.startsWith("video/") == true }
      val audio = formats.count { it.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true }
      check(video.size == 1 && audio <= 1) { "Unexpected recording tracks." }
      retriever.setDataSource(file.path)
      val duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
      check(duration > 0) { "No complete frame was recorded." }
      val track = formats.indexOf(video[0]); extractor.selectTrack(track)
      check(extractor.sampleTime >= 0) { "The video track contains no samples." }
      val frame = retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
      check(frame != null) { "The recording could not be decoded." }; frame.recycle()
      return mapOf("width" to video[0].getInteger(MediaFormat.KEY_WIDTH), "height" to video[0].getInteger(MediaFormat.KEY_HEIGHT),
        "durationMs" to duration, "fileSizeBytes" to file.length(), "videoTrackCount" to 1, "audioTrackCount" to audio, "playable" to true)
    } finally { extractor.release(); retriever.release() }
  }
  @Synchronized fun finalize(recording: Recording, preset: Preset, firstPts: Double, swapped: Boolean, corner: Int): Payload {
    val clips = recording.clips.map { clip ->
      val media = media(clip.file)
      check(media["width"] == preset.width && media["height"] == preset.height) { "The recorded resolution is incorrect." }
      if ((recording.manifest["audio"] as Map<*, *>)["kind"] == "present") check(media["audioTrackCount"] == 1) { "The microphone track is missing." }
      mapOf("id" to clip.id, "role" to clip.role, "relativePath" to clip.file.name, "status" to "ready", "media" to media, "issue" to null)
    }
    val duration = clips.minOf { ((it["media"] as Map<*, *>)["durationMs"] as Number).toLong() }
    recording.manifest["clips"] = clips
    recording.manifest["startedAtPtsSeconds"] = firstPts
    recording.manifest["outcome"] = mapOf("kind" to "ready", "durationMs" to duration, "finalizedAtUtcMs" to System.currentTimeMillis())
    if (preset.mode in listOf("pip", "split")) recording.manifest["composition"] = composition(preset, swapped, corner)
    write(recording.directory, recording.manifest)
    check(recording.directory.renameTo(File(library, recording.id))) { "Could not publish the recording." }
    activeId = null
    return recording.manifest
  }
  private fun write(directory: File, manifest: Payload) {
    val atomic = AtomicFile(File(directory, "manifest.json"))
    val stream = atomic.startWrite()
    try { stream.write(JSONObject(manifest).toString(2).toByteArray()); atomic.finishWrite(stream) }
    catch (error: Throwable) { atomic.failWrite(stream); throw error }
  }
  private fun read(directory: File): Payload = JSONObject(String(AtomicFile(File(directory, "manifest.json")).readFully())).payload()
  private fun clipFile(directory: File, path: String): File {
    require(path.isNotEmpty() && File(path).name == path && path !in listOf(".", ".."))
    return File(directory, path).also { require(it.canonicalFile.parentFile == directory.canonicalFile) }
  }
  @Synchronized fun list(): List<Payload> {
    recover()
    return library.listFiles().orEmpty().filter { it.isDirectory }.mapNotNull { directory ->
      runCatching {
        val manifest = read(directory)
        require(manifest["schemaVersion"] == 1 && manifest["recordingSetId"] == directory.name)
        val clips = manifest["clips"] as List<*>
        manifest + mapOf("directoryUri" to Uri.fromFile(directory).toString(), "clipUris" to clips.map { raw ->
          val clip = raw as Map<*, *>
          mapOf("clipId" to clip["id"], "uri" to Uri.fromFile(clipFile(directory, clip["relativePath"] as String)).toString())
        })
      }.getOrNull()
    }.sortedByDescending { (it["createdAtUtcMs"] as? Number)?.toLong() ?: 0L }
  }
  @Synchronized fun delete(id: String): Boolean {
    val directory = File(library, CaptureRules.identifier(id))
    check(directory.isDirectory) { "That recording no longer exists." }
    check(directory.deleteRecursively()) { "The recording could not be deleted." }
    return true
  }
  @Synchronized fun rename(id: String, name: String): Payload {
    val trimmed = name.trim()
    require(trimmed.isNotEmpty() && trimmed.codePointCount(0, trimmed.length) <= 120) { "Use a name between 1 and 120 characters." }
    val directory = File(library, CaptureRules.identifier(id))
    val manifest = read(directory).toMutableMap(); manifest["name"] = trimmed
    write(directory, manifest); return manifest
  }
  @Synchronized fun abandon() { activeId = null }
  private fun recover() {
    staging.listFiles().orEmpty().filter { it.isDirectory && it.name != activeId }.forEach { directory ->
      runCatching {
        val id = CaptureRules.identifier(directory.name)
        val manifest = read(directory).toMutableMap()
        require(manifest["schemaVersion"] == 1 && manifest["recordingSetId"] == id)
        val clips = (manifest["clips"] as List<*>).map { raw ->
          val clip = (raw as Map<*, *>).entries.associate { it.key as String to it.value }.toMutableMap()
          val validated = runCatching { media(clipFile(directory, clip["relativePath"] as String)) }.getOrNull()
          clip["media"] = validated
          clip["status"] = if (validated != null) "ready" else "corrupt"
          clip["issue"] = if (validated != null) null else "The interrupted file could not be decoded."
          clip
        }
        val playable = clips.filter { it["status"] == "ready" }.map { it["id"] }
        manifest["clips"] = clips
        if ((manifest["outcome"] as? Map<*, *>)?.get("kind") != "ready" || playable.size != clips.size) {
          manifest["outcome"] = if (playable.isNotEmpty()) mapOf("kind" to "recoverable", "reason" to "finalization-incomplete", "playableClipIds" to playable)
            else mapOf("kind" to "corrupt", "reason" to "unreadable-track")
          manifest["warnings"] = listOf(mapOf("kind" to "recovery", "message" to "Recording was interrupted before finalization."))
          write(directory, manifest)
        }
        val destination = File(library, id)
        if (!destination.exists()) check(directory.renameTo(destination))
      }
    }
  }
}
