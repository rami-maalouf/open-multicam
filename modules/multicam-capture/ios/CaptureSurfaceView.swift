import ExpoModulesCore
import UIKit

final class CaptureSurfaceView: ExpoView {
  let onCaptureEvent = EventDispatcher()
  private let eventSequence = CaptureBoundaryEventSequence()
  private var hasPublishedMount = false
  private var isObservingLifecycle = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    guard window != nil else {
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
    eventSequence.invalidateCurrentState()
  }

  @objc private func appWillEnterForeground() {
    publishIdleState()
  }
}
