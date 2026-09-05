import AVFoundation
import ExpoModulesCore
import UIKit

final class CaptureSurfaceView: ExpoView {
  private let primaryPreviewLayer = AVCaptureVideoPreviewLayer()
  private let secondaryPreviewLayer = AVCaptureVideoPreviewLayer()
  private let primaryPreviewHost = UIView()
  private let secondaryPreviewHost = UIView()
  private let panGesture = UIPanGestureRecognizer()
  private let swapTapGesture = UITapGestureRecognizer()
  private var captureMode: CaptureMode = .single
  private var pipCorner: CapturePipCorner = .topTrailing
  private var isPipSwapped = false
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
    primaryPreviewHost.backgroundColor = .black
    primaryPreviewHost.layer.addSublayer(primaryPreviewLayer)
    addSubview(primaryPreviewHost)
    secondaryPreviewHost.backgroundColor = .black
    secondaryPreviewHost.isHidden = true
    secondaryPreviewHost.layer.addSublayer(secondaryPreviewLayer)
    addSubview(secondaryPreviewHost)

    panGesture.addTarget(self, action: #selector(handlePipPan))
    addGestureRecognizer(panGesture)
    swapTapGesture.addTarget(self, action: #selector(handleSwapTap))
    addGestureRecognizer(swapTapGesture)
    updateAccessibilityActions()
  }

  /// The host currently drawn as the small inset. Follows the swap so the pan
  /// gesture and the corner layout always act on whichever camera is small.
  private var pipHost: UIView {
    isPipSwapped ? primaryPreviewHost : secondaryPreviewHost
  }

  private var fullScreenHost: UIView {
    isPipSwapped ? secondaryPreviewHost : primaryPreviewHost
  }

  private var pipPreviewLayer: AVCaptureVideoPreviewLayer {
    isPipSwapped ? primaryPreviewLayer : secondaryPreviewLayer
  }

  private var fullScreenPreviewLayer: AVCaptureVideoPreviewLayer {
    isPipSwapped ? secondaryPreviewLayer : primaryPreviewLayer
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if secondaryPreviewHost.isHidden {
      primaryPreviewHost.frame = bounds
      primaryPreviewLayer.frame = primaryPreviewHost.bounds
      secondaryPreviewHost.frame = .zero
      secondaryPreviewLayer.frame = .zero
      return
    }

    if captureMode == .pip {
      fullScreenHost.frame = bounds
      fullScreenPreviewLayer.frame = fullScreenHost.bounds
      if !isDraggingPip {
        pipHost.frame = CapturePipLayout.frame(
          in: bounds,
          corner: pipCorner
        )
      }
      pipPreviewLayer.frame = pipHost.bounds
      return
    }

    let paneHeight = bounds.height / 2
    primaryPreviewHost.frame = CGRect(
      x: 0,
      y: 0,
      width: bounds.width,
      height: paneHeight
    )
    primaryPreviewLayer.frame = primaryPreviewHost.bounds
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

  func applyPreviewLayout(
    mode: CaptureMode,
    corner: CapturePipCorner,
    isSwapped: Bool
  ) {
    captureMode = mode
    pipCorner = corner
    isPipSwapped = mode == .pip && isSwapped
    let showsSecondary = mode != .single
    secondaryPreviewHost.isHidden = !showsSecondary
    secondaryPreviewLayer.isHidden = !showsSecondary

    applyPipStyling()
    updateAccessibilityActions()
    setNeedsLayout()
  }

  /// Dresses whichever host is currently the inset, and strips that styling
  /// from the one behind it. Called again after every swap.
  private func applyPipStyling() {
    let isPip = captureMode == .pip
    let inset = pipHost
    let insetLayer = pipPreviewLayer
    let background = fullScreenHost
    let backgroundLayer = fullScreenPreviewLayer

    if isPip {
      bringSubviewToFront(inset)
    }

    inset.isAccessibilityElement = isPip
    inset.accessibilityLabel = isPip ? "Inset camera preview" : nil
    inset.accessibilityHint = isPip
      ? "Drag to move it, or use an accessibility action to choose a corner or swap the cameras."
      : nil
    inset.layer.cornerCurve = isPip ? .continuous : .circular
    inset.layer.cornerRadius = isPip ? 24 : 0
    inset.layer.borderWidth = isPip ? 1.5 : 0
    inset.layer.borderColor = isPip
      ? UIColor.white.withAlphaComponent(0.45).cgColor
      : nil
    inset.layer.shadowColor = isPip ? UIColor.black.cgColor : nil
    inset.layer.shadowOpacity = isPip ? 0.35 : 0
    inset.layer.shadowRadius = isPip ? 18 : 0
    inset.layer.shadowOffset = isPip ? CGSize(width: 0, height: 8) : .zero
    insetLayer.cornerRadius = isPip ? 24 : 0
    insetLayer.masksToBounds = isPip

    background.isAccessibilityElement = false
    background.accessibilityLabel = nil
    background.accessibilityHint = nil
    background.accessibilityCustomActions = nil
    background.layer.cornerRadius = 0
    background.layer.borderWidth = 0
    background.layer.borderColor = nil
    background.layer.shadowColor = nil
    background.layer.shadowOpacity = 0
    background.layer.shadowRadius = 0
    background.layer.shadowOffset = .zero
    backgroundLayer.cornerRadius = 0
    backgroundLayer.masksToBounds = false
  }

  override func gestureRecognizerShouldBegin(
    _ gestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    guard captureMode == .pip else {
      return false
    }

    // The tap swaps the two cameras from anywhere in the preview; the pan only
    // starts on the inset itself so the full screen camera stays put.
    if gestureRecognizer === swapTapGesture {
      return true
    }

    return pipHost.frame.contains(gestureRecognizer.location(in: self))
  }

  @objc private func handleSwapTap(_ gesture: UITapGestureRecognizer) {
    // A pan cancels the tap once the finger passes the slop threshold, but a
    // drag that settles back under it would still fire here.
    guard captureMode == .pip, !isDraggingPip else {
      return
    }
    setPipSwapped(!isPipSwapped, animated: true)
  }

  private func setPipSwapped(_ swapped: Bool, animated: Bool) {
    guard captureMode == .pip, swapped != isPipSwapped else {
      return
    }

    isPipSwapped = swapped
    CaptureSessionService.shared.updatePipSwapped(swapped)
    applyPipStyling()
    updateAccessibilityActions()
    UIImpactFeedbackGenerator(style: .soft).impactOccurred()

    let insetTarget = CapturePipLayout.frame(in: bounds, corner: pipCorner)
    let inset = pipHost
    let insetLayer = pipPreviewLayer
    let background = fullScreenHost
    let backgroundLayer = fullScreenPreviewLayer

    guard animated, !UIAccessibility.isReduceMotionEnabled else {
      background.frame = bounds
      backgroundLayer.frame = background.bounds
      inset.frame = insetTarget
      insetLayer.frame = inset.bounds
      return
    }

    let backgroundTarget = bounds
    let animator = UIViewPropertyAnimator(
      duration: 0.36,
      timingParameters: UISpringTimingParameters(dampingRatio: 0.85)
    )
    animator.addAnimations {
      background.frame = backgroundTarget
      backgroundLayer.frame = background.bounds
      inset.frame = insetTarget
      insetLayer.frame = inset.bounds
    }
    animator.startAnimation()
  }

  @objc private func handlePipPan(_ gesture: UIPanGestureRecognizer) {
    switch gesture.state {
    case .began:
      isDraggingPip = true
      dragOrigin = pipHost.center
      UIImpactFeedbackGenerator(style: .soft).prepare()
    case .changed:
      let translation = gesture.translation(in: self)
      pipHost.center = CapturePipLayout.clampedCenter(
        CGPoint(x: dragOrigin.x + translation.x, y: dragOrigin.y + translation.y),
        itemSize: pipHost.bounds.size,
        in: bounds
      )
    case .ended, .cancelled, .failed:
      let corner = CapturePipLayout.nearestCorner(
        to: pipHost.center,
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
    let inset = pipHost
    let insetLayer = pipPreviewLayer
    CaptureSessionService.shared.updatePipCorner(corner)
    updateAccessibilityActions()
    UIImpactFeedbackGenerator(style: .soft).impactOccurred()

    guard animated, !UIAccessibility.isReduceMotionEnabled else {
      inset.frame = target
      insetLayer.frame = inset.bounds
      return
    }

    let distance = CGPoint(
      x: target.midX - inset.center.x,
      y: target.midY - inset.center.y
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
      inset.frame = target
      insetLayer.frame = inset.bounds
    }
    animator.startAnimation()
  }

  private func updateAccessibilityActions() {
    guard captureMode == .pip else {
      primaryPreviewHost.accessibilityCustomActions = nil
      secondaryPreviewHost.accessibilityCustomActions = nil
      return
    }

    let inset = pipHost
    fullScreenHost.accessibilityCustomActions = nil
    inset.accessibilityValue = pipCorner.accessibilityName

    var actions: [UIAccessibilityCustomAction] = CapturePipCorner.allCases.map { corner in
      UIAccessibilityCustomAction(
        name: "Move to \(corner.accessibilityName)",
        actionHandler: { [weak self] _ in
          self?.movePip(to: corner, animated: true)
          return true
        }
      )
    }
    actions.append(
      UIAccessibilityCustomAction(
        name: "Swap with the full screen camera",
        actionHandler: { [weak self] _ in
          guard let self else {
            return false
          }
          self.setPipSwapped(!self.isPipSwapped, animated: true)
          return true
        }
      )
    )
    inset.accessibilityCustomActions = actions
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
