import AVFoundation
import ExpoModulesCore
import UIKit

final class CaptureSurfaceView: ExpoView {
  private let primaryPreviewLayer = AVCaptureVideoPreviewLayer()
  private let secondaryPreviewLayer = AVCaptureVideoPreviewLayer()
  private let primaryPreviewHost = UIView()
  private let secondaryPreviewHost = UIView()
  private let panGesture = UIPanGestureRecognizer()
  private let previewTapGesture = UITapGestureRecognizer()
  private let zoomPinchGesture = UIPinchGestureRecognizer()
  private var captureMode: CaptureMode = .single
  private var pipCorner: CapturePipCorner = .topTrailing
  private var isPipSwapped = false
  private var dragOrigin = CGPoint.zero
  private var isDraggingPip = false
  private var pinchSlot: Int?
  private var zoomStartFactor: CGFloat = 1
  private weak var focusReticle: UIView?
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
    previewTapGesture.addTarget(self, action: #selector(handlePreviewTap))
    addGestureRecognizer(previewTapGesture)
    zoomPinchGesture.addTarget(self, action: #selector(handleZoomPinch))
    addGestureRecognizer(zoomPinchGesture)
    updateAccessibilityActions()
  }

  /// The host in the secondary slot: the inset in pip, the lower pane in
  /// split. Follows the swap so the drag and the corner layout always act on
  /// whichever camera is currently the small one.
  private var trailingHost: UIView {
    isPipSwapped ? primaryPreviewHost : secondaryPreviewHost
  }

  /// True while the viewer is allowed to swap the two slots: both composite
  /// modes qualify, discrete draws equal panes from fixed files.
  private var allowsSwap: Bool {
    captureMode == .pip || captureMode == .split
  }

  private var leadingHost: UIView {
    isPipSwapped ? secondaryPreviewHost : primaryPreviewHost
  }

  private var trailingPreviewLayer: AVCaptureVideoPreviewLayer {
    isPipSwapped ? primaryPreviewLayer : secondaryPreviewLayer
  }

  private var leadingPreviewLayer: AVCaptureVideoPreviewLayer {
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
      leadingHost.frame = bounds
      leadingPreviewLayer.frame = leadingHost.bounds
      if !isDraggingPip {
        trailingHost.frame = CapturePipLayout.frame(
          in: bounds,
          corner: pipCorner
        )
      }
      trailingPreviewLayer.frame = trailingHost.bounds
      return
    }

    // discrete and split both show two panes; only split lets the viewer
    // swap which camera sits on top
    let panes = CaptureSplitLayout.viewPanes(in: bounds)
    leadingHost.frame = panes.top
    leadingPreviewLayer.frame = leadingHost.bounds
    trailingHost.frame = panes.bottom
    trailingPreviewLayer.frame = trailingHost.bounds
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
    isPipSwapped = (mode == .pip || mode == .split) && isSwapped
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
    let inset = trailingHost
    let insetLayer = trailingPreviewLayer
    let background = leadingHost
    let backgroundLayer = leadingPreviewLayer

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
    // The pinch zooms whichever camera is under the fingers, so it works in
    // every mode that shows a preview at all.
    if gestureRecognizer === zoomPinchGesture {
      return true
    }

    // The tap either promotes the inset or points focus at whatever the
    // viewer touched, so it begins everywhere.
    if gestureRecognizer === previewTapGesture {
      return true
    }

    guard captureMode == .pip else {
      return false
    }

    return trailingHost.frame.contains(gestureRecognizer.location(in: self))
  }

  @objc private func handlePreviewTap(_ gesture: UITapGestureRecognizer) {
    // A pan cancels the tap once the finger passes the slop threshold, but a
    // drag that settles back under it would still fire here.
    guard !isDraggingPip else {
      return
    }

    let point = gesture.location(in: self)

    // Only the inset promotes. The large preview stays a focus target, which
    // is the one place a tap has an obvious camera meaning.
    if captureMode == .pip, trailingHost.frame.contains(point) {
      setPipSwapped(!isPipSwapped, animated: true)
      return
    }

    focus(at: point)
  }

  /// Points the tapped camera's focus and exposure at that spot, and shows a
  /// reticle so the viewer can see the request landed.
  private func focus(at point: CGPoint) {
    let assignment = CapturePipAssignment.resolve(isSwapped: isPipSwapped)
    let isOnTrailing = !secondaryPreviewHost.isHidden &&
      trailingHost.frame.contains(point)
    let host = isOnTrailing ? trailingHost : leadingHost
    let previewLayer = isOnTrailing ? trailingPreviewLayer : leadingPreviewLayer
    let slot = isOnTrailing ? assignment.insetIndex : assignment.fullScreenIndex
    let pointInHost = convert(point, to: host)

    guard host.bounds.contains(pointInHost) else {
      return
    }

    // the service drops the request if that camera cannot be pointed, so the
    // reticle is only feedback that the tap was heard
    CaptureSessionService.shared.focus(
      at: previewLayer.captureDevicePointConverted(fromLayerPoint: pointInHost),
      slot: slot
    )
    showFocusReticle(at: point)
    UIImpactFeedbackGenerator(style: .light).impactOccurred()
  }

  private func showFocusReticle(at point: CGPoint) {
    focusReticle?.removeFromSuperview()

    let reticle = UIView(frame: CGRect(x: 0, y: 0, width: 78, height: 78))
    reticle.center = point
    reticle.isUserInteractionEnabled = false
    reticle.layer.borderColor = UIColor.systemYellow.cgColor
    reticle.layer.borderWidth = 1.5
    reticle.layer.cornerCurve = .continuous
    reticle.layer.cornerRadius = 6
    addSubview(reticle)
    focusReticle = reticle

    guard !UIAccessibility.isReduceMotionEnabled else {
      fadeOutFocusReticle(reticle, after: 0.6)
      return
    }

    reticle.transform = CGAffineTransform(scaleX: 1.35, y: 1.35)
    UIViewPropertyAnimator(duration: 0.25, dampingRatio: 0.7) {
      reticle.transform = .identity
    }.startAnimation()
    fadeOutFocusReticle(reticle, after: 0.9)
  }

  private func fadeOutFocusReticle(_ reticle: UIView, after delay: TimeInterval) {
    let animator = UIViewPropertyAnimator(duration: 0.3, curve: .easeOut) {
      reticle.alpha = 0
    }
    animator.addCompletion { [weak self, weak reticle] _ in
      reticle?.removeFromSuperview()
      if self?.focusReticle === reticle {
        self?.focusReticle = nil
      }
    }
    animator.startAnimation(afterDelay: delay)
  }

  /// Pinching zooms the camera under the fingers. A physical lens cannot go
  /// below 1.0, so this only ever crops in; reaching wider is a lens change.
  @objc private func handleZoomPinch(_ gesture: UIPinchGestureRecognizer) {
    switch gesture.state {
    case .began:
      let slot = pinchTargetSlot(of: gesture)
      pinchSlot = slot
      zoomStartFactor = CaptureSessionService.shared.zoomFactor(forSlot: slot)
    case .changed:
      guard let pinchSlot else {
        return
      }
      CaptureSessionService.shared.setZoomFactor(
        zoomStartFactor * gesture.scale,
        forSlot: pinchSlot
      )
    case .ended, .cancelled, .failed:
      pinchSlot = nil
    default:
      break
    }
  }

  /// Slot 0 is the leading camera, slot 1 the trailing one. In pip a pinch
  /// that starts on the inset zooms the inset; everywhere else it zooms the
  /// camera filling that part of the screen.
  private func pinchTargetSlot(of gesture: UIPinchGestureRecognizer) -> Int {
    let assignment = CapturePipAssignment.resolve(isSwapped: isPipSwapped)

    guard captureMode != .single, !secondaryPreviewHost.isHidden else {
      return 0
    }

    // the trailing host is the inset in pip and the lower pane in split, so
    // one hit test covers both
    let isOnTrailing = trailingHost.frame.contains(gesture.location(in: self))

    return isOnTrailing ? assignment.insetIndex : assignment.fullScreenIndex
  }

  private func setPipSwapped(_ swapped: Bool, animated: Bool) {
    guard allowsSwap, swapped != isPipSwapped else {
      return
    }

    isPipSwapped = swapped
    CaptureSessionService.shared.updatePipSwapped(swapped)
    applyPipStyling()
    updateAccessibilityActions()
    UIImpactFeedbackGenerator(style: .soft).impactOccurred()

    let panes = CaptureSplitLayout.viewPanes(in: bounds)
    let backgroundTarget = captureMode == .split ? panes.top : bounds
    let insetTarget = captureMode == .split
      ? panes.bottom
      : CapturePipLayout.frame(in: bounds, corner: pipCorner)
    let inset = trailingHost
    let insetLayer = trailingPreviewLayer
    let background = leadingHost
    let backgroundLayer = leadingPreviewLayer

    guard animated, !UIAccessibility.isReduceMotionEnabled else {
      background.frame = backgroundTarget
      backgroundLayer.frame = background.bounds
      inset.frame = insetTarget
      insetLayer.frame = inset.bounds
      return
    }
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
      dragOrigin = trailingHost.center
      UIImpactFeedbackGenerator(style: .soft).prepare()
    case .changed:
      let translation = gesture.translation(in: self)
      trailingHost.center = CapturePipLayout.clampedCenter(
        CGPoint(x: dragOrigin.x + translation.x, y: dragOrigin.y + translation.y),
        itemSize: trailingHost.bounds.size,
        in: bounds
      )
    case .ended, .cancelled, .failed:
      let corner = CapturePipLayout.nearestCorner(
        to: trailingHost.center,
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
    let inset = trailingHost
    let insetLayer = trailingPreviewLayer
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

    let inset = trailingHost
    leadingHost.accessibilityCustomActions = nil
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
