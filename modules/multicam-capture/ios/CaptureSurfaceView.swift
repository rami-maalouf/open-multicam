import ExpoModulesCore
import UIKit

final class CaptureSurfaceView: ExpoView {
  let onCaptureEvent = EventDispatcher()
  private var hasPublishedMount = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    guard window != nil else {
      hasPublishedMount = false
      return
    }

    guard !hasPublishedMount else {
      return
    }

    hasPublishedMount = true
    onCaptureEvent([
      "kind": "state-changed",
      "sequence": 1,
      "state": ["kind": "idle"]
    ])
  }
}
