import AVFoundation
import ExpoModulesCore
import UIKit

final class CaptureSurfaceView: ExpoView {
  private let primaryPreviewLayer = AVCaptureVideoPreviewLayer()
  private let secondaryPreviewLayer = AVCaptureVideoPreviewLayer()
  private var isAttached = false
  private var isObservingLifecycle = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
    primaryPreviewLayer.videoGravity = .resizeAspectFill
    secondaryPreviewLayer.videoGravity = .resizeAspectFill
    secondaryPreviewLayer.isHidden = true
    layer.addSublayer(primaryPreviewLayer)
    layer.addSublayer(secondaryPreviewLayer)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if secondaryPreviewLayer.isHidden {
      primaryPreviewLayer.frame = bounds
      secondaryPreviewLayer.frame = .zero
      return
    }

    let paneHeight = bounds.height / 2
    primaryPreviewLayer.frame = CGRect(
      x: 0,
      y: 0,
      width: bounds.width,
      height: paneHeight
    )
    secondaryPreviewLayer.frame = CGRect(
      x: 0,
      y: paneHeight,
      width: bounds.width,
      height: bounds.height - paneHeight
    )
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    guard window != nil else {
      if isAttached {
        CaptureSessionService.shared.detachPreviewLayers()
        isAttached = false
      }
      stopObservingLifecycle()
      return
    }

    startObservingLifecycle()

    guard !isAttached else {
      return
    }

    isAttached = true
    CaptureSessionService.shared.attachPreviewLayers([
      primaryPreviewLayer,
      secondaryPreviewLayer
    ])
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

  @objc private func appDidEnterBackground() {
    CaptureSessionService.shared.suspendPreview()
  }

  @objc private func appWillEnterForeground() {
    CaptureSessionService.shared.resumePreview()
  }
}
