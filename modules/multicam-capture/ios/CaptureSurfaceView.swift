import AVFoundation
import ExpoModulesCore
import UIKit

final class CaptureSurfaceView: ExpoView {
  let onCaptureEvent = EventDispatcher()
  private let previewSession = CapturePreviewSession()
  private let eventSequence = CaptureBoundaryEventSequence()
  private var hasPublishedMount = false
  private var isObservingLifecycle = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
    layer.addSublayer(previewSession.previewLayer)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewSession.previewLayer.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    guard window != nil else {
      previewSession.stop()
      hasPublishedMount = false
      stopObservingLifecycle()
      eventSequence.invalidateCurrentState()
      return
    }

    startObservingLifecycle()

    guard !hasPublishedMount else {
      return
    }

    hasPublishedMount = true
    publishIdleState()
    previewSession.start()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  private func startObservingLifecycle() {
    guard !isObservingLifecycle else {
      return
    }

    isObservingLifecycle = true
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(appDidEnterBackground),
      name: UIApplication.didEnterBackgroundNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(appWillEnterForeground),
      name: UIApplication.willEnterForegroundNotification,
      object: nil
    )
  }

  private func stopObservingLifecycle() {
    guard isObservingLifecycle else {
      return
    }

    isObservingLifecycle = false
    NotificationCenter.default.removeObserver(self)
  }

  private func publishIdleState() {
    guard let event = eventSequence.stateChanged(to: ["kind": "idle"]) else {
      return
    }

    onCaptureEvent(event)
  }

  @objc private func appDidEnterBackground() {
    previewSession.stop()
    eventSequence.invalidateCurrentState()
  }

  @objc private func appWillEnterForeground() {
    publishIdleState()
    previewSession.start()
  }
}

private final class CapturePreviewSession {
  let previewLayer: AVCaptureVideoPreviewLayer

  private let captureSession = AVCaptureSession()
  private let sessionQueue = DispatchQueue(
    label: "app.openmulticam.capture-preview",
    qos: .userInitiated
  )
  private var isConfigured = false
  private var wantsPreview = false

  init() {
    previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
    previewLayer.videoGravity = .resizeAspectFill
  }

  func start() {
    sessionQueue.async { [weak self] in
      guard let self else {
        return
      }

      self.wantsPreview = true
      self.startWithCameraAccess()
    }
  }

  func stop() {
    sessionQueue.async { [weak self] in
      guard let self else {
        return
      }

      self.wantsPreview = false
      if self.captureSession.isRunning {
        self.captureSession.stopRunning()
      }
    }
  }

  private func startWithCameraAccess() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      configureAndStart()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard granted else {
          return
        }

        self?.sessionQueue.async {
          self?.configureAndStart()
        }
      }
    case .denied, .restricted:
      return
    @unknown default:
      return
    }
  }

  private func configureAndStart() {
    guard wantsPreview else {
      return
    }

    if !isConfigured {
      guard configureSession() else {
        return
      }
    }

    if !captureSession.isRunning {
      captureSession.startRunning()
    }
  }

  private func configureSession() -> Bool {
    guard let device = CaptureDeviceDiscovery.preferredVideoDevice() else {
      return false
    }

    do {
      let input = try AVCaptureDeviceInput(device: device)
      captureSession.beginConfiguration()
      defer { captureSession.commitConfiguration() }
      captureSession.sessionPreset = .high

      guard captureSession.canAddInput(input) else {
        return false
      }

      captureSession.addInput(input)
      isConfigured = true
      return true
    } catch {
      return false
    }
  }
}
