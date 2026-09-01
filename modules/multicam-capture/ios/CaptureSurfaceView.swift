import AVFoundation
import ExpoModulesCore
import UIKit

final class CaptureSurfaceView: ExpoView {
  private let primaryPreviewLayer = AVCaptureVideoPreviewLayer()
  private let secondaryPreviewLayer = AVCaptureVideoPreviewLayer()
  private let secondaryPreviewHost = UIView()
  private var captureMode: CaptureMode = .single
  private var pipCorner: CapturePipCorner = .topTrailing
  private var dragOrigin = CGPoint.zero
  private var isDraggingPip = false
  private var isAttached = false
  private var isObservingLifecycle = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
    primaryPreviewLayer.videoGravity = .resizeAspectFill
    secondaryPreviewLayer.videoGravity = .resizeAspectFill
    secondaryPreviewLayer.isHidden = true
    layer.insertSublayer(primaryPreviewLayer, at: 0)
    secondaryPreviewHost.backgroundColor = .black
    secondaryPreviewHost.isHidden = true
    secondaryPreviewHost.isAccessibilityElement = true
    secondaryPreviewHost.accessibilityLabel = "Front camera preview"
    secondaryPreviewHost.accessibilityHint =
      "Drag to move it, or use an accessibility action to choose a corner."
    secondaryPreviewHost.layer.addSublayer(secondaryPreviewLayer)
    addSubview(secondaryPreviewHost)

    let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePipPan))
    addGestureRecognizer(pan)
    updateAccessibilityActions()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if secondaryPreviewHost.isHidden {
      primaryPreviewLayer.frame = bounds
      secondaryPreviewHost.frame = .zero
      secondaryPreviewLayer.frame = .zero
      return
    }

    if captureMode == .pip {
      primaryPreviewLayer.frame = bounds
      if !isDraggingPip {
        secondaryPreviewHost.frame = CapturePipLayout.frame(
          in: bounds,
          corner: pipCorner
        )
      }
      secondaryPreviewLayer.frame = secondaryPreviewHost.bounds
      return
    }

    let paneHeight = bounds.height / 2
    primaryPreviewLayer.frame = CGRect(x: 0, y: 0, width: bounds.width, height: paneHeight)
    secondaryPreviewHost.frame = CGRect(
      x: 0,
      y: paneHeight,
      width: bounds.width,
      height: bounds.height - paneHeight
    )
    secondaryPreviewLayer.frame = secondaryPreviewHost.bounds
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
    CaptureSessionService.shared.attachPreviewLayers(
      [primaryPreviewLayer, secondaryPreviewLayer],
      surface: self
    )
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

  func applyPreviewLayout(mode: CaptureMode, corner: CapturePipCorner) {
    captureMode = mode
    pipCorner = corner
    let showsSecondary = mode != .single
    secondaryPreviewHost.isHidden = !showsSecondary
    secondaryPreviewLayer.isHidden = !showsSecondary

    let isPip = mode == .pip
    secondaryPreviewHost.layer.cornerCurve = isPip ? .continuous : .circular
    secondaryPreviewHost.layer.cornerRadius = isPip ? 24 : 0
    secondaryPreviewHost.layer.borderWidth = isPip ? 1.5 : 0
    secondaryPreviewHost.layer.borderColor = isPip
      ? UIColor.white.withAlphaComponent(0.45).cgColor
      : nil
    secondaryPreviewHost.layer.shadowColor = isPip ? UIColor.black.cgColor : nil
    secondaryPreviewHost.layer.shadowOpacity = isPip ? 0.35 : 0
    secondaryPreviewHost.layer.shadowRadius = isPip ? 18 : 0
    secondaryPreviewHost.layer.shadowOffset = isPip
      ? CGSize(width: 0, height: 8)
      : .zero
    secondaryPreviewLayer.cornerRadius = isPip ? 24 : 0
    secondaryPreviewLayer.masksToBounds = isPip
    updateAccessibilityActions()
    setNeedsLayout()
  }

  override func gestureRecognizerShouldBegin(
    _ gestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    guard captureMode == .pip else {
      return false
    }
    return secondaryPreviewHost.frame.contains(gestureRecognizer.location(in: self))
  }

  @objc private func handlePipPan(_ gesture: UIPanGestureRecognizer) {
    switch gesture.state {
    case .began:
      isDraggingPip = true
      dragOrigin = secondaryPreviewHost.center
      UIImpactFeedbackGenerator(style: .soft).prepare()
    case .changed:
      let translation = gesture.translation(in: self)
      secondaryPreviewHost.center = CapturePipLayout.clampedCenter(
        CGPoint(x: dragOrigin.x + translation.x, y: dragOrigin.y + translation.y),
        itemSize: secondaryPreviewHost.bounds.size,
        in: bounds
      )
    case .ended, .cancelled, .failed:
      let corner = CapturePipLayout.nearestCorner(
        to: secondaryPreviewHost.center,
        velocity: gesture.velocity(in: self),
        in: bounds
      )
      movePip(
        to: corner,
        animated: gesture.state == .ended,
        initialVelocity: gesture.velocity(in: self)
      )
    default:
      break
    }
  }

  private func movePip(
    to corner: CapturePipCorner,
    animated: Bool,
    initialVelocity: CGPoint = .zero
  ) {
    isDraggingPip = false
    pipCorner = corner
    let target = CapturePipLayout.frame(in: bounds, corner: corner)
    CaptureSessionService.shared.updatePipCorner(corner)
    updateAccessibilityActions()
    UIImpactFeedbackGenerator(style: .soft).impactOccurred()

    guard animated, !UIAccessibility.isReduceMotionEnabled else {
      secondaryPreviewHost.frame = target
      secondaryPreviewLayer.frame = secondaryPreviewHost.bounds
      return
    }

    let distance = CGPoint(
      x: target.midX - secondaryPreviewHost.center.x,
      y: target.midY - secondaryPreviewHost.center.y
    )
    let velocity = CGPoint(
      x: distance.x == 0 ? 0 : min(8, max(-8, initialVelocity.x / distance.x)),
      y: distance.y == 0 ? 0 : min(8, max(-8, initialVelocity.y / distance.y))
    )
    let timing = UISpringTimingParameters(
      dampingRatio: 0.8,
      initialVelocity: CGVector(dx: velocity.x, dy: velocity.y)
    )
    let animator = UIViewPropertyAnimator(duration: 0.4, timingParameters: timing)
    animator.addAnimations {
      self.secondaryPreviewHost.frame = target
      self.secondaryPreviewLayer.frame = self.secondaryPreviewHost.bounds
    }
    animator.startAnimation()
  }

  private func updateAccessibilityActions() {
    guard captureMode == .pip else {
      secondaryPreviewHost.accessibilityCustomActions = nil
      return
    }

    secondaryPreviewHost.accessibilityValue = pipCorner.accessibilityName
    secondaryPreviewHost.accessibilityCustomActions = CapturePipCorner.allCases.map { corner in
      UIAccessibilityCustomAction(
        name: "Move to \(corner.accessibilityName)",
        actionHandler: { [weak self] _ in
          self?.movePip(to: corner, animated: true)
          return true
        }
      )
    }
  }
}

private extension CapturePipCorner {
  var accessibilityName: String {
    switch self {
    case .topLeading:
      "top left"
    case .topTrailing:
      "top right"
    case .bottomLeading:
      "bottom left"
    case .bottomTrailing:
      "bottom right"
    }
  }
}
