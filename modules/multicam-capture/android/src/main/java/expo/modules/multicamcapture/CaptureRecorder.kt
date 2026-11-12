package expo.modules.multicamcapture

import android.content.Context
import android.media.*
import android.os.Build
import android.view.Surface
import java.io.File
import java.nio.ByteBuffer

internal class CaptureRecorder(
  private val context: Context, private val preset: Preset,
  private val recording: CaptureStorage.Recording, private val audio: Boolean,
  private val onFailure: () -> Unit
) {
  private val recorders = mutableListOf<MediaRecorder>()
  private val surfaces = mutableListOf<Surface>()
  fun prepare(): List<Surface> {
    try {
      recording.clips.forEachIndexed { index, clip ->
        @Suppress("DEPRECATION")
        val recorder = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else MediaRecorder()
        recorders += recorder
        if (audio && index == 0) recorder.setAudioSource(MediaRecorder.AudioSource.CAMCORDER)
        recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE)
        recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        recorder.setOutputFile(clip.file.path)
        recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264)
        recorder.setVideoSize(preset.width, preset.height)
        recorder.setVideoFrameRate(preset.frameRate)
        recorder.setVideoEncodingBitRate(preset.bitrate)
        if (audio && index == 0) {
          recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
          recorder.setAudioChannels(1); recorder.setAudioSamplingRate(44100); recorder.setAudioEncodingBitRate(128000)
        }
        recorder.setOnErrorListener { _, _, _ -> onFailure() }
        recorder.prepare(); surfaces += recorder.surface
      }
      return surfaces
    } catch (error: Throwable) { release(); throw error }
  }
  fun start() { recorders.forEach { it.start() } }
  fun stop() {
    var failure: Throwable? = null
    recorders.forEach { runCatching { it.stop() }.onFailure { error -> failure = failure ?: error } }
    release()
    failure?.let { throw it }
    if (audio && recording.clips.size == 2) copyAudio(recording.clips[0].file, recording.clips[1].file)
  }
  fun release() {
    recorders.forEach { runCatching { it.reset() }; runCatching { it.release() } }; recorders.clear()
    surfaces.forEach { runCatching { it.release() } }; surfaces.clear()
  }
  private fun copyAudio(source: File, destination: File) {
    val output = File(destination.parentFile, "${destination.name}.remux")
    val video = MediaExtractor(); val audio = MediaExtractor()
    var muxer: MediaMuxer? = null
    try {
      video.setDataSource(destination.path); audio.setDataSource(source.path)
      fun track(extractor: MediaExtractor, prefix: String): Int = (0 until extractor.trackCount).first {
        extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith(prefix) == true
      }
      val vt = track(video, "video/"); val at = track(audio, "audio/")
      val writer = MediaMuxer(output.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
      muxer = writer
      val videoOutput = writer.addTrack(video.getTrackFormat(vt)); val audioOutput = writer.addTrack(audio.getTrackFormat(at))
      writer.start()
      fun copy(extractor: MediaExtractor, input: Int, target: Int) {
        extractor.selectTrack(input)
        val format = extractor.getTrackFormat(input)
        val maxSize = if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE) else 0
        val buffer = ByteBuffer.allocateDirect(maxOf(maxSize, 4 * 1024 * 1024))
        val info = MediaCodec.BufferInfo()
        while (extractor.sampleTime >= 0) {
          buffer.clear()
          val count = extractor.readSampleData(buffer, 0)
          if (count < 0) break
          info.set(0, count, extractor.sampleTime, if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0) MediaCodec.BUFFER_FLAG_KEY_FRAME else 0)
          writer.writeSampleData(target, buffer, info)
          extractor.advance()
        }
      }
      copy(video, vt, videoOutput); copy(audio, at, audioOutput)
      writer.stop(); writer.release(); muxer = null
      check(output.renameTo(destination)) { "Could not attach the microphone track to the second recording." }
    } finally { video.release(); audio.release(); runCatching { muxer?.release() }; output.delete() }
  }
}
