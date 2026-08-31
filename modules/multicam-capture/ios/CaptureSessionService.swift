import AVFoundation
import Foundation

final class CaptureSessionService: @unchecked Sendable {
  static let shared = CaptureSessionService()

  private let sessionQueue = DispatchQueue(
    label: "app.openmulticam.capture-session",
    qos: .userInitiated
  )
  private var captureSession: AVCaptureSession?
  private var preset: CapturePreset?
  private var previewLayers: [AVCaptureVideoPreviewLayer] = []
  private var previewConnections: [AVCaptureConnection] = []
  private var mountedSurfaceCount = 0
  private var wantsPreview = false

  private init() {}

  func attachPreviewLayers(_ layers: [AVCaptureVideoPreviewLayer]) {
    sessionQueue.async {
      self.mountedSurfaceCount += 1
      self.previewLayers = layers
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
            try self.configureSession(preset: preset, snapshot: snapshot)
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

  private func configureSession(
    preset: CapturePreset,
    snapshot: CaptureCapabilitySnapshot
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
          requiresMulticam: preset.mode != .single
        )

        let input = try AVCaptureDeviceInput(device: device)
        guard session.canAddInput(input) else {
          throw CaptureFailure.sessionConfigurationFailed
        }
        session.addInputWithNoConnections(input)
      }

      session.commitConfiguration()
    } catch {
      session.commitConfiguration()
      throw error
    }

    captureSession = session
    self.preset = preset
    connectPreviewLayers()
    startSessionIfNeeded()
  }

  private func configure(
    device: AVCaptureDevice,
    frameRate: Int,
    requiresMulticam: Bool
  ) throws {
    guard let format = CaptureDeviceDiscovery.format(
      for: device,
      frameRate: frameRate,
      requiresMulticam: requiresMulticam
    ) else {
      throw CaptureFailure.configurationUnavailable
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
    DispatchQueue.main.async {
      for (index, layer) in self.previewLayers.enumerated() {
        layer.isHidden = index >= cameraCount
      }
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
  }
}
