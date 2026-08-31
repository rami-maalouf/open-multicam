import AVFoundation
import Foundation

final class CaptureRecordingWriter: @unchecked Sendable {
  private struct OutputWriter {
    let output: AVCaptureVideoDataOutput
    let writer: AVAssetWriter
    let videoInput: AVAssetWriterInput
    let audioInput: AVAssetWriterInput?
  }

  private let writers: [OutputWriter]
  private let audioOutput: AVCaptureAudioDataOutput?
  private var startedAt: CMTime?
  private var lastVideoTime: CMTime?
  private var hasWrittenAudio = false

  init(
    context: CaptureRecordingContext,
    videoOutputs: [AVCaptureVideoDataOutput],
    audioOutput: AVCaptureAudioDataOutput?
  ) throws {
    guard context.clips.count == videoOutputs.count else {
      throw CaptureFailure.recordingPreparationFailed
    }

    self.audioOutput = audioOutput
    writers = try zip(context.clips, videoOutputs).map { clip, output in
      let writer = try AVAssetWriter(outputURL: clip.fileURL, fileType: .mp4)
      let compression: [String: Any] = [
        AVVideoAverageBitRateKey: context.preset.bitrate,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoExpectedSourceFrameRateKey: context.preset.frameRate,
        AVVideoMaxKeyFrameIntervalKey: context.preset.frameRate * 2
      ]
      let videoInput = AVAssetWriterInput(
        mediaType: .video,
        outputSettings: [
          AVVideoCodecKey: AVVideoCodecType.h264,
          AVVideoWidthKey: context.preset.width,
          AVVideoHeightKey: context.preset.height,
          AVVideoCompressionPropertiesKey: compression
        ]
      )
      videoInput.expectsMediaDataInRealTime = true

      guard writer.canAdd(videoInput) else {
        throw CaptureFailure.recordingPreparationFailed
      }
      writer.add(videoInput)

      let audioInput: AVAssetWriterInput?
      if audioOutput != nil {
        let input = AVAssetWriterInput(
          mediaType: .audio,
          outputSettings: [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVNumberOfChannelsKey: 1,
            AVSampleRateKey: 44_100,
            AVEncoderBitRateKey: 96_000
          ]
        )
        input.expectsMediaDataInRealTime = true
        guard writer.canAdd(input) else {
          throw CaptureFailure.recordingPreparationFailed
        }
        writer.add(input)
        audioInput = input
      } else {
        audioInput = nil
      }

      guard writer.startWriting() else {
        throw CaptureFailure.recordingPreparationFailed
      }

      return OutputWriter(
        output: output,
        writer: writer,
        videoInput: videoInput,
        audioInput: audioInput
      )
    }
  }

  func append(_ collection: AVCaptureSynchronizedDataCollection) {
    let videoSamples = writers.compactMap { writer -> CMSampleBuffer? in
      guard
        let synchronized = collection.synchronizedData(for: writer.output)
          as? AVCaptureSynchronizedSampleBufferData,
        !synchronized.sampleBufferWasDropped
      else {
        return nil
      }
      return synchronized.sampleBuffer
    }

    guard videoSamples.count == writers.count else {
      return
    }

    if startedAt == nil {
      let startTime = videoSamples
        .map(CMSampleBufferGetPresentationTimeStamp)
        .min(by: { CMTimeCompare($0, $1) < 0 }) ?? .zero
      startedAt = startTime
      writers.forEach { $0.writer.startSession(atSourceTime: startTime) }
    }

    for (writer, sample) in zip(writers, videoSamples) {
      if writer.videoInput.isReadyForMoreMediaData {
        writer.videoInput.append(sample)
      }
      let time = CMSampleBufferGetPresentationTimeStamp(sample)
      if lastVideoTime == nil || CMTimeCompare(time, lastVideoTime!) > 0 {
        lastVideoTime = time
      }
    }

    guard
      let audioOutput,
      let synchronizedAudio = collection.synchronizedData(for: audioOutput)
        as? AVCaptureSynchronizedSampleBufferData,
      !synchronizedAudio.sampleBufferWasDropped,
      let startedAt,
      CMTimeCompare(
        CMSampleBufferGetPresentationTimeStamp(synchronizedAudio.sampleBuffer),
        startedAt
      ) >= 0
    else {
      return
    }

    for writer in writers {
      if writer.audioInput?.isReadyForMoreMediaData == true {
        writer.audioInput?.append(synchronizedAudio.sampleBuffer)
        hasWrittenAudio = true
      }
    }
  }

  func finish() async -> Result<CaptureWriterResult, CaptureFailure> {
    guard let startedAt, let lastVideoTime else {
      writers.forEach { $0.writer.cancelWriting() }
      return .failure(.recordingTooShort)
    }

    writers.forEach {
      $0.videoInput.markAsFinished()
      $0.audioInput?.markAsFinished()
    }

    await withCheckedContinuation { continuation in
      let group = DispatchGroup()
      for outputWriter in writers {
        group.enter()
        outputWriter.writer.finishWriting {
          group.leave()
        }
      }
      group.notify(queue: .global(qos: .userInitiated)) {
        continuation.resume()
      }
    }

    guard writers.allSatisfy({ $0.writer.status == .completed }) else {
      return .failure(.recordingFinalizationFailed)
    }

    let durationSeconds = max(0, CMTimeGetSeconds(lastVideoTime - startedAt))
    return .success(
      CaptureWriterResult(
        durationMs: max(1, Int(durationSeconds * 1_000)),
        startedAtPtsSeconds: CMTimeGetSeconds(startedAt),
        hasAudio: hasWrittenAudio
      )
    )
  }
}
