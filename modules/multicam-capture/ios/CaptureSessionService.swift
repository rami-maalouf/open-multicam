import AVFoundation
import Foundation

final class CaptureSessionService: NSObject, @unchecked Sendable {
  static let shared = CaptureSessionService()

  private let sessionQueue = DispatchQueue(
    label: "app.openmulticam.capture-session",
    qos: .userInitiated
  )
  private var captureSession: AVCaptureSession?
  private var preset: CapturePreset?
  private var previewLayers: [AVCaptureVideoPreviewLayer] = []
  private weak var previewSurface: CaptureSurfaceView?
  private var previewConnections: [AVCaptureConnection] = []
  private var mountedSurfaceCount = 0
  private var wantsPreview = false
  private var videoOutputs: [AVCaptureVideoDataOutput] = []
  private var audioOutput: AVCaptureAudioDataOutput?
  private var dataSynchronizer: AVCaptureDataOutputSynchronizer?
  private var pipCorner: CapturePipCorner = .topTrailing
  private var recordingContext: CaptureRecordingContext?
  private var recordingWriter: CaptureRecordingWriter?

  private override init() {
    super.init()
  }

  func attachPreviewLayers(
    _ layers: [AVCaptureVideoPreviewLayer],
    surface: CaptureSurfaceView
  ) {
    sessionQueue.async {
      self.mountedSurfaceCount += 1
      self.previewLayers = layers
      self.previewSurface = surface
      self.wantsPreview = true
      self.connectPreviewLayers()
      self.startSessionIfNeeded()
    }
  }

  func detachPreviewLayers() {
    sessionQueue.async {
      self.mountedSurfaceCount = max(0, self.mountedSurfaceCount - 1)

      guard self.mountedSurfaceCount == 0 else {
        return
      }

      self.wantsPreview = false
      self.disconnectPreviewLayers()
      self.previewLayers = []
      self.previewSurface = nil
      self.stopAndTearDownSession()
    }
  }

  func configure(
    request: [String: Any],
    isSimulator: Bool
  ) async -> Result<CapturePreset, CaptureFailure> {
    await withCheckedContinuation { continuation in
      sessionQueue.async {
        let snapshot = CaptureDeviceDiscovery.snapshot(isSimulator: isSimulator)

        switch snapshot.resolve(request: request) {
        case let .failure(error):
          continuation.resume(returning: .failure(error))
        case let .success(preset):
          do {
            try self.configureSession(
              preset: preset,
              snapshot: snapshot,
              isSimulator: isSimulator
            )
            continuation.resume(returning: .success(preset))
          } catch let error as CaptureFailure {
            continuation.resume(returning: .failure(error))
          } catch {
            continuation.resume(returning: .failure(.sessionConfigurationFailed))
          }
        }
      }
    }
  }

  func resumePreview() {
    sessionQueue.async {
      self.wantsPreview = self.mountedSurfaceCount > 0
      self.startSessionIfNeeded()
    }
  }

  func suspendPreview() {
    sessionQueue.async {
      self.wantsPreview = false
      if self.captureSession?.isRunning == true {
        self.captureSession?.stopRunning()
      }
    }
  }

  func tearDown() {
    sessionQueue.async {
      self.stopAndTearDownSession()
    }
  }

  func updatePipCorner(_ corner: CapturePipCorner) {
    sessionQueue.async {
      self.pipCorner = corner
      self.recordingWriter?.updatePipCorner(corner)
    }
  }

  func prepareRecording(
    recordingSetId: String
  ) async -> Result<String, CaptureFailure> {
    await withCheckedContinuation { continuation in
      sessionQueue.async {
        guard
          let preset = self.preset,
          self.recordingWriter == nil,
          let captureSession = self.captureSession
        else {
          continuation.resume(returning: .failure(.invalidStateTransition))
          return
        }

        let deviceIds = [preset.cameraAId, preset.cameraBId].compactMap { $0 }
        let devices = deviceIds.compactMap { id in
          captureSession.inputs
            .compactMap { $0 as? AVCaptureDeviceInput }
            .first(where: { $0.device.uniqueID == id })?.device
        }

        do {
          let context = try CaptureRecordingStorage.prepare(
            recordingSetId: recordingSetId,
            preset: preset,
            devices: devices,
            expectsAudio: self.audioOutput != nil
          )
          self.recordingWriter = try CaptureRecordingWriter(
            context: context,
            videoOutputs: self.videoOutputs,
            audioOutput: self.audioOutput,
            pipCorner: self.pipCorner
          )
          self.recordingContext = context
          continuation.resume(returning: .success(context.recordingSetId))
        } catch let failure as CaptureFailure {
          continuation.resume(returning: .failure(failure))
        } catch {
          continuation.resume(returning: .failure(.recordingPreparationFailed))
        }
      }
    }
  }

  func stopRecording() async -> Result<CaptureFinalizedRecording, CaptureFailure> {
    let prepared: (CaptureRecordingContext, CaptureRecordingWriter)? = await withCheckedContinuation {
      continuation in
      sessionQueue.async {
        let value = self.recordingContext.flatMap { context in
          self.recordingWriter.map { (context, $0) }
        }
        self.recordingContext = nil
        self.recordingWriter = nil
        continuation.resume(returning: value)
      }
    }

    guard let (context, writer) = prepared else {
      return .failure(.invalidStateTransition)
    }

    switch await writer.finish() {
    case let .failure(failure):
      return .failure(failure)
    case let .success(writerResult):
      do {
        return .success(
          try await CaptureRecordingStorage.finalize(
            context: context,
            writerResult: writerResult
          )
        )
      } catch let failure as CaptureFailure {
        return .failure(failure)
      } catch {
        return .failure(.recordingFinalizationFailed)
      }
    }
  }

  private func configureSession(
    preset: CapturePreset,
    snapshot: CaptureCapabilitySnapshot,
    isSimulator: Bool
  ) throws {
    let cameraIds = [preset.cameraAId, preset.cameraBId].compactMap { $0 }
    let devices = cameraIds.compactMap(snapshot.device(id:))

    guard devices.count == cameraIds.count else {
      throw CaptureFailure.configurationUnavailable
    }

    stopAndTearDownSession()

    let session: AVCaptureSession = preset.mode == .single
      ? AVCaptureSession()
      : AVCaptureMultiCamSession()
    session.beginConfiguration()
    session.sessionPreset = .inputPriority

    do {
      for device in devices {
        try configure(
          device: device,
          frameRate: preset.frameRate,
          requiresMulticam: preset.mode != .single,
          allowsResolutionFallback: isSimulator
        )

        let input = try AVCaptureDeviceInput(device: device)
        guard session.canAddInput(input) else {
          throw CaptureFailure.sessionConfigurationFailed
        }
        if preset.mode == .single {
          session.addInput(input)
        } else {
          session.addInputWithNoConnections(input)
        }
      }

      videoOutputs = try devices.map { device in
        guard
          let input = session.inputs
            .compactMap({ $0 as? AVCaptureDeviceInput })
            .first(where: { $0.device.uniqueID == device.uniqueID })
        else {
          throw CaptureFailure.sessionConfigurationFailed
        }

        let output = AVCaptureVideoDataOutput()
        output.alwaysDiscardsLateVideoFrames = preset.mode == .pip
        output.videoSettings = [
          kCVPixelBufferPixelFormatTypeKey as String:
            kCVPixelFormatType_420YpCbCr8BiPlanarFullRange
        ]
        guard session.canAddOutput(output) else {
          throw CaptureFailure.sessionConfigurationFailed
        }
        if preset.mode == .single {
          session.addOutput(output)
          guard let connection = output.connection(with: .video) else {
            throw CaptureFailure.sessionConfigurationFailed
          }
          applyVideoProperties(connection, preset: preset, position: device.position)
        } else {
          guard let port = input.ports.first(where: { $0.mediaType == .video }) else {
            throw CaptureFailure.sessionConfigurationFailed
          }
          session.addOutputWithNoConnections(output)
          let connection = AVCaptureConnection(inputPorts: [port], output: output)
          applyVideoProperties(connection, preset: preset, position: device.position)
          guard session.canAddConnection(connection) else {
            throw CaptureFailure.sessionConfigurationFailed
          }
          session.addConnection(connection)
        }
        return output
      }

      audioOutput = try configureAudioIfAuthorized(session: session)

      session.commitConfiguration()
    } catch {
      session.commitConfiguration()
      throw error
    }

    if preset.mode == .single {
      videoOutputs.forEach {
        $0.setSampleBufferDelegate(self, queue: sessionQueue)
      }
      audioOutput?.setSampleBufferDelegate(self, queue: sessionQueue)
      dataSynchronizer = nil
    } else {
      let synchronizedOutputs: [AVCaptureOutput] =
        videoOutputs.map { $0 as AVCaptureOutput } +
        (audioOutput.map { [$0 as AVCaptureOutput] } ?? [])
      let synchronizer = AVCaptureDataOutputSynchronizer(
        dataOutputs: synchronizedOutputs
      )
      synchronizer.setDelegate(self, queue: sessionQueue)
      dataSynchronizer = synchronizer
    }

    captureSession = session
    self.preset = preset
    connectPreviewLayers()
    startSessionIfNeeded()
  }

  private func configureAudioIfAuthorized(
    session: AVCaptureSession
  ) throws -> AVCaptureAudioDataOutput? {
    guard
      AVCaptureDevice.authorizationStatus(for: .audio) == .authorized,
      let microphone = AVCaptureDevice.default(for: .audio)
    else {
      return nil
    }

    let input = try AVCaptureDeviceInput(device: microphone)
    guard session.canAddInput(input) else {
      return nil
    }
    let requiresManualConnections = session is AVCaptureMultiCamSession
    if requiresManualConnections {
      session.addInputWithNoConnections(input)
    } else {
      session.addInput(input)
    }

    guard let port = input.ports.first(where: { $0.mediaType == .audio }) else {
      return nil
    }
    let output = AVCaptureAudioDataOutput()
    guard session.canAddOutput(output) else {
      return nil
    }
    if !requiresManualConnections {
      session.addOutput(output)
      return output
    }

    session.addOutputWithNoConnections(output)
    let connection = AVCaptureConnection(inputPorts: [port], output: output)
    guard session.canAddConnection(connection) else {
      return nil
    }
    session.addConnection(connection)
    return output
  }

  private func configure(
    device: AVCaptureDevice,
    frameRate: Int,
    requiresMulticam: Bool,
    allowsResolutionFallback: Bool
  ) throws {
    guard let format = CaptureDeviceDiscovery.format(
      for: device,
      frameRate: frameRate,
      requiresMulticam: requiresMulticam,
      allowsResolutionFallback: allowsResolutionFallback
    ) else {
      throw CaptureFailure.configurationUnavailable
    }

    guard !allowsResolutionFallback else {
      return
    }

    try device.lockForConfiguration()
    defer { device.unlockForConfiguration() }
    device.activeFormat = format
    let duration = CMTime(value: 1, timescale: CMTimeScale(frameRate))
    device.activeVideoMinFrameDuration = duration
    device.activeVideoMaxFrameDuration = duration
  }

  private func connectPreviewLayers() {
    guard
      let captureSession,
      let preset,
      !previewLayers.isEmpty
    else {
      return
    }

    disconnectPreviewLayers()
    captureSession.beginConfiguration()

    let cameraIds = [preset.cameraAId, preset.cameraBId].compactMap { $0 }

    for (index, cameraId) in cameraIds.enumerated() {
      guard
        index < previewLayers.count,
        let input = captureSession.inputs
          .compactMap({ $0 as? AVCaptureDeviceInput })
          .first(where: { $0.device.uniqueID == cameraId }),
        let port = input.ports.first(where: { $0.mediaType == .video })
      else {
        continue
      }

      let layer = previewLayers[index]
      if preset.mode == .single {
        layer.session = captureSession
        if let connection = layer.connection {
          applyVideoProperties(connection, preset: preset, position: input.device.position)
        }
        continue
      }

      layer.setSessionWithNoConnection(captureSession)
      let connection = AVCaptureConnection(inputPort: port, videoPreviewLayer: layer)
      applyVideoProperties(connection, preset: preset, position: input.device.position)

      guard captureSession.canAddConnection(connection) else {
        continue
      }

      captureSession.addConnection(connection)
      previewConnections.append(connection)
    }

    captureSession.commitConfiguration()
    updateLayerVisibility(for: cameraIds.count)
  }

  private func disconnectPreviewLayers() {
    guard let captureSession else {
      previewConnections = []
      return
    }

    captureSession.beginConfiguration()
    previewConnections.forEach(captureSession.removeConnection)
    captureSession.commitConfiguration()
    previewConnections = []

    previewLayers.forEach { $0.session = nil }
  }

  private func updateLayerVisibility(for cameraCount: Int) {
    let mode = preset?.mode ?? .single
    let corner = pipCorner
    DispatchQueue.main.async {
      for (index, layer) in self.previewLayers.enumerated() {
        layer.isHidden = index >= cameraCount
      }
      self.previewSurface?.applyPreviewLayout(mode: mode, corner: corner)
    }
  }

  private func applyVideoProperties(
    _ connection: AVCaptureConnection,
    preset: CapturePreset,
    position: AVCaptureDevice.Position
  ) {
    let rotationAngle: CGFloat = preset.orientation == .portrait ? 90 : 0
    if connection.isVideoRotationAngleSupported(rotationAngle) {
      connection.videoRotationAngle = rotationAngle
    }
    connection.automaticallyAdjustsVideoMirroring = false
    if connection.isVideoMirroringSupported {
      connection.isVideoMirrored = position == .front
    }
  }

  private func startSessionIfNeeded() {
    guard
      wantsPreview,
      let captureSession,
      !captureSession.isRunning
    else {
      return
    }

    captureSession.startRunning()
  }

  private func stopAndTearDownSession() {
    if captureSession?.isRunning == true {
      captureSession?.stopRunning()
    }
    disconnectPreviewLayers()
    captureSession = nil
    preset = nil
    videoOutputs = []
    audioOutput = nil
    dataSynchronizer = nil
    recordingContext = nil
    recordingWriter = nil
  }
}

extension CaptureSessionService: AVCaptureDataOutputSynchronizerDelegate {
  func dataOutputSynchronizer(
    _ synchronizer: AVCaptureDataOutputSynchronizer,
    didOutput synchronizedDataCollection: AVCaptureSynchronizedDataCollection
  ) {
    recordingWriter?.append(synchronizedDataCollection)
  }
}

extension CaptureSessionService:
  AVCaptureVideoDataOutputSampleBufferDelegate,
  AVCaptureAudioDataOutputSampleBufferDelegate
{
  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    if let videoOutput = output as? AVCaptureVideoDataOutput {
      recordingWriter?.appendVideo(sampleBuffer, from: videoOutput)
    } else if output is AVCaptureAudioDataOutput {
      recordingWriter?.appendAudio(sampleBuffer)
    }
  }
}
