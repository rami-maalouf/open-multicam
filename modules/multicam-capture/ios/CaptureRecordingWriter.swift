import AVFoundation
import CoreImage
import Foundation

final class CaptureRecordingWriter: @unchecked Sendable {
  private struct PipDiagnostics {
    var synchronizedCollections = 0
    var primaryFramesSeen = 0
    var secondaryFramesSeen = 0
    var validFramePairs = 0
    var writerUnavailableCount = 0
    var inputNotReadyCount = 0
    var pixelBufferPoolMissingCount = 0
    var bufferAllocationFailureCount = 0
    var appendRejectionCount = 0
    var framesAppended = 0

    func payload(writer: AVAssetWriter?) -> [String: Any] {
      var result: [String: Any] = [
        "synchronizedCollections": synchronizedCollections,
        "primaryFramesSeen": primaryFramesSeen,
        "secondaryFramesSeen": secondaryFramesSeen,
        "validFramePairs": validFramePairs,
        "writerUnavailableCount": writerUnavailableCount,
        "inputNotReadyCount": inputNotReadyCount,
        "pixelBufferPoolMissingCount": pixelBufferPoolMissingCount,
        "bufferAllocationFailureCount": bufferAllocationFailureCount,
        "appendRejectionCount": appendRejectionCount,
        "framesAppended": framesAppended,
        "writerStatus": Self.statusName(writer?.status ?? .unknown)
      ]

      if let error = writer?.error as NSError? {
        result["writerErrorDomain"] = error.domain
        result["writerErrorCode"] = error.code
      }
      return result
    }

    private static func statusName(_ status: AVAssetWriter.Status) -> String {
      switch status {
      case .unknown: "unknown"
      case .writing: "writing"
      case .completed: "completed"
      case .failed: "failed"
      case .cancelled: "cancelled"
      @unknown default: "future"
      }
    }
  }

  private struct OutputWriter {
    let output: AVCaptureVideoDataOutput?
    let writer: AVAssetWriter
    let videoInput: AVAssetWriterInput
    let pixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
    let compositePixelBufferPool: CVPixelBufferPool?
    let audioInput: AVAssetWriterInput?
  }

  private let writers: [OutputWriter]
  private let videoOutputs: [AVCaptureVideoDataOutput]
  private let audioOutput: AVCaptureAudioDataOutput?
  private let preset: CapturePreset
  private let compositorContext: CIContext?
  private var pipCorner: CapturePipCorner
  private var startedAt: CMTime?
  private var lastVideoTime: CMTime?
  private var hasWrittenAudio = false
  private var pipDiagnostics = PipDiagnostics()
  private var latestPipPrimaryBuffer: CVPixelBuffer?
  private var latestPipSecondaryBuffer: CVPixelBuffer?

  init(
    context: CaptureRecordingContext,
    videoOutputs: [AVCaptureVideoDataOutput],
    audioOutput: AVCaptureAudioDataOutput?,
    pipCorner: CapturePipCorner
  ) throws {
    let isPip = context.preset.mode == .pip
    guard isPip
      ? context.clips.count == 1 && videoOutputs.count == 2
      : context.clips.count == videoOutputs.count
    else {
      throw CaptureFailure.recordingPreparationFailed
    }

    preset = context.preset
    self.videoOutputs = videoOutputs
    self.audioOutput = audioOutput
    self.pipCorner = pipCorner
    compositorContext = isPip
      ? CIContext(options: [.cacheIntermediates: false])
      : nil

    if isPip {
      writers = [
        try Self.makeWriter(
          clip: context.clips[0],
          output: nil,
          context: context,
          isComposite: true,
          hasAudio: audioOutput != nil
        )
      ]
    } else {
      writers = try zip(context.clips, videoOutputs).map { clip, output in
        try Self.makeWriter(
          clip: clip,
          output: output,
          context: context,
          isComposite: false,
          hasAudio: audioOutput != nil
        )
      }
    }
  }

  func updatePipCorner(_ corner: CapturePipCorner) {
    pipCorner = corner
  }

  func append(_ collection: AVCaptureSynchronizedDataCollection) {
    if preset.mode == .pip {
      appendPip(collection)
      appendSynchronizedAudio(collection)
      return
    }

    let videoSamples = writers.compactMap { writer -> CMSampleBuffer? in
      guard
        let output = writer.output,
        let synchronized = collection.synchronizedData(for: output)
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

    let startTime = videoSamples
      .map(CMSampleBufferGetPresentationTimeStamp)
      .min(by: { CMTimeCompare($0, $1) < 0 }) ?? .zero
    beginIfNeeded(at: startTime)

    for (writer, sample) in zip(writers, videoSamples) {
      if writer.videoInput.isReadyForMoreMediaData {
        writer.videoInput.append(sample)
      }
      updateLastVideoTime(CMSampleBufferGetPresentationTimeStamp(sample))
    }

    appendSynchronizedAudio(collection)
  }

  func appendVideo(
    _ sampleBuffer: CMSampleBuffer,
    from output: AVCaptureVideoDataOutput
  ) {
    guard let writer = writers.first(where: { $0.output === output }) else {
      return
    }

    let time = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    beginIfNeeded(at: time)

    if writer.videoInput.isReadyForMoreMediaData {
      writer.videoInput.append(sampleBuffer)
    }
    updateLastVideoTime(time)
  }

  func appendAudio(_ sampleBuffer: CMSampleBuffer) {
    guard
      audioOutput != nil,
      let startedAt,
      CMTimeCompare(
        CMSampleBufferGetPresentationTimeStamp(sampleBuffer),
        startedAt
      ) >= 0
    else {
      return
    }

    for writer in writers where writer.audioInput?.isReadyForMoreMediaData == true {
      writer.audioInput?.append(sampleBuffer)
      hasWrittenAudio = true
    }
  }

  func finish() async -> Result<CaptureWriterResult, CaptureFailure> {
    guard let startedAt, let lastVideoTime else {
      let failure = preset.mode == .pip
        ? CaptureFailure.recordingTooShort.withDiagnostics(
            pipDiagnostics.payload(writer: writers.first?.writer)
          )
        : CaptureFailure.recordingTooShort
      writers.forEach { $0.writer.cancelWriting() }
      return .failure(failure)
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
        hasAudio: hasWrittenAudio,
        pipCorner: preset.mode == .pip ? pipCorner : nil
      )
    )
  }

  private static func makeWriter(
    clip: CaptureRecordingClipPlan,
    output: AVCaptureVideoDataOutput?,
    context: CaptureRecordingContext,
    isComposite: Bool,
    hasAudio: Bool
  ) throws -> OutputWriter {
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

    let pixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
    let compositePixelBufferPool: CVPixelBufferPool?
    if isComposite {
      let pixelBufferAttributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: context.preset.width,
        kCVPixelBufferHeightKey as String: context.preset.height,
        kCVPixelBufferIOSurfacePropertiesKey as String: [:],
        kCVPixelBufferMetalCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
      ]
      pixelBufferAdaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: videoInput,
        sourcePixelBufferAttributes: pixelBufferAttributes
      )

      var pool: CVPixelBufferPool?
      guard
        CVPixelBufferPoolCreate(
          nil,
          nil,
          pixelBufferAttributes as CFDictionary,
          &pool
        ) == kCVReturnSuccess,
        let pool
      else {
        throw CaptureFailure.recordingPreparationFailed
      }
      compositePixelBufferPool = pool
    } else {
      pixelBufferAdaptor = nil
      compositePixelBufferPool = nil
    }

    let audioInput: AVAssetWriterInput?
    if hasAudio {
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
      pixelBufferAdaptor: pixelBufferAdaptor,
      compositePixelBufferPool: compositePixelBufferPool,
      audioInput: audioInput
    )
  }

  private func appendPip(_ collection: AVCaptureSynchronizedDataCollection) {
    pipDiagnostics.synchronizedCollections += 1
    guard
      videoOutputs.count == 2,
      let writer = writers.first,
      let adaptor = writer.pixelBufferAdaptor,
      let compositorContext
    else {
      return
    }

    let primarySample = synchronizedVideoSample(
      from: collection,
      output: videoOutputs[0]
    )
    let secondarySample = synchronizedVideoSample(
      from: collection,
      output: videoOutputs[1]
    )

    if
      let secondarySample,
      let secondaryBuffer = CMSampleBufferGetImageBuffer(secondarySample)
    {
      latestPipSecondaryBuffer = secondaryBuffer
      pipDiagnostics.secondaryFramesSeen += 1
    }

    guard let primarySample else {
      return
    }
    guard let primaryBuffer = CMSampleBufferGetImageBuffer(primarySample) else {
      return
    }
    latestPipPrimaryBuffer = primaryBuffer
    pipDiagnostics.primaryFramesSeen += 1

    guard
      let primaryBuffer = latestPipPrimaryBuffer,
      let secondaryBuffer = latestPipSecondaryBuffer
    else {
      return
    }
    pipDiagnostics.validFramePairs += 1

    let time = CMSampleBufferGetPresentationTimeStamp(primarySample)
    beginIfNeeded(at: time)

    guard writer.writer.status == .writing else {
      pipDiagnostics.writerUnavailableCount += 1
      return
    }
    guard writer.videoInput.isReadyForMoreMediaData else {
      pipDiagnostics.inputNotReadyCount += 1
      return
    }
    guard let pool = writer.compositePixelBufferPool else {
      pipDiagnostics.pixelBufferPoolMissingCount += 1
      return
    }

    autoreleasepool {
      var destination: CVPixelBuffer?
      guard
        CVPixelBufferPoolCreatePixelBuffer(nil, pool, &destination) == kCVReturnSuccess,
        let destination
      else {
        pipDiagnostics.bufferAllocationFailureCount += 1
        return
      }

      let canvas = CGRect(
        x: 0,
        y: 0,
        width: preset.width,
        height: preset.height
      )
      let primaryImage = aspectFilled(
        CIImage(cvPixelBuffer: primaryBuffer),
        into: canvas
      )
      let insetFromTop = CapturePipLayout.frame(in: canvas, corner: pipCorner)
      let inset = CGRect(
        x: insetFromTop.minX,
        y: canvas.height - insetFromTop.maxY,
        width: insetFromTop.width,
        height: insetFromTop.height
      )
      let secondaryImage = aspectFilled(
        CIImage(cvPixelBuffer: secondaryBuffer),
        into: inset
      )
      let composite = roundedComposite(
        secondaryImage,
        over: primaryImage,
        inset: inset
      )

      compositorContext.render(
        composite,
        to: destination,
        bounds: canvas,
        colorSpace: CGColorSpaceCreateDeviceRGB()
      )
      if adaptor.append(destination, withPresentationTime: time) {
        pipDiagnostics.framesAppended += 1
        updateLastVideoTime(time)
      } else {
        pipDiagnostics.appendRejectionCount += 1
      }
    }
  }

  private func appendSynchronizedAudio(
    _ collection: AVCaptureSynchronizedDataCollection
  ) {
    guard
      let audioOutput,
      let synchronizedAudio = collection.synchronizedData(for: audioOutput)
        as? AVCaptureSynchronizedSampleBufferData,
      !synchronizedAudio.sampleBufferWasDropped
    else {
      return
    }

    appendAudio(synchronizedAudio.sampleBuffer)
  }

  private func synchronizedVideoSample(
    from collection: AVCaptureSynchronizedDataCollection,
    output: AVCaptureVideoDataOutput
  ) -> CMSampleBuffer? {
    guard
      let synchronized = collection.synchronizedData(for: output)
        as? AVCaptureSynchronizedSampleBufferData,
      !synchronized.sampleBufferWasDropped
    else {
      return nil
    }
    return synchronized.sampleBuffer
  }

  private func aspectFilled(_ image: CIImage, into target: CGRect) -> CIImage {
    let source = image.extent
    let normalized = image.transformed(
      by: CGAffineTransform(translationX: -source.minX, y: -source.minY)
    )
    let scale = max(
      target.width / normalized.extent.width,
      target.height / normalized.extent.height
    )
    let scaled = normalized.transformed(
      by: CGAffineTransform(scaleX: scale, y: scale)
    )
    let positioned = scaled.transformed(
      by: CGAffineTransform(
        translationX: target.midX - scaled.extent.midX,
        y: target.midY - scaled.extent.midY
      )
    )
    return positioned.cropped(to: target)
  }

  private func roundedComposite(
    _ foreground: CIImage,
    over background: CIImage,
    inset: CGRect
  ) -> CIImage {
    guard
      let mask = CIFilter(
        name: "CIRoundedRectangleGenerator",
        parameters: [
          "inputExtent": CIVector(cgRect: inset),
          "inputRadius": min(inset.width, inset.height) * 0.08,
          "inputColor": CIColor.white
        ]
      )?.outputImage
    else {
      return foreground.composited(over: background)
    }

    return foreground.applyingFilter(
      "CIBlendWithMask",
      parameters: [
        kCIInputBackgroundImageKey: background,
        kCIInputMaskImageKey: mask.cropped(to: inset)
      ]
    )
  }

  private func beginIfNeeded(at startTime: CMTime) {
    guard startedAt == nil else {
      return
    }

    startedAt = startTime
    writers.forEach { $0.writer.startSession(atSourceTime: startTime) }
  }

  private func updateLastVideoTime(_ time: CMTime) {
    if lastVideoTime == nil || CMTimeCompare(time, lastVideoTime!) > 0 {
      lastVideoTime = time
    }
  }
}
