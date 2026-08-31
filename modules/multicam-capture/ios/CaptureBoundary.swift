import Foundation

enum CaptureBoundaryPayloads {
  static let simulatorCameraUnavailableMessage =
    "No simulator camera was found. Start SimCam, then reopen OpenMulticam."
  static let simulatorSingleCameraMessage =
    "SimCam is connected. Single-camera preview is available; dual-camera capture still requires a physical iPhone."
  static let deviceSingleCameraMessage =
    "Single-camera preview is available, but this iPhone does not support multicamera capture."
  static let unavailableMessage = "Camera discovery is not active yet."

  static func deviceCapabilities(
    discoveredAtMs: Double,
    cameras: [[String: Any]],
    configurations: [[String: Any]] = [],
    recommendedConfigurationId: String? = nil,
    isMulticamSupported: Bool,
    isSimulator: Bool
  ) -> [String: Any] {
    let multicam: [String: Any]

    if isMulticamSupported {
      multicam = ["kind": "supported"]
    } else if cameras.isEmpty {
      multicam = [
        "kind": "unsupported",
        "reason": [
          "kind": "camera-unavailable",
          "message": isSimulator
            ? simulatorCameraUnavailableMessage
            : unavailableMessage
        ]
      ]
    } else {
      multicam = [
        "kind": "unsupported",
        "reason": [
          "kind": "multicam-unsupported",
          "message": isSimulator
            ? simulatorSingleCameraMessage
            : deviceSingleCameraMessage
        ]
      ]
    }

    var result: [String: Any] = [
      "kind": "device-capabilities",
      "schemaVersion": 1,
      "discoveredAtMs": discoveredAtMs,
      "cameras": cameras,
      "multicam": multicam,
      "configurations": configurations
    ]

    if let recommendedConfigurationId {
      result["recommendedConfigurationId"] = recommendedConfigurationId
    }

    return result
  }

  static func unavailableResult() -> [String: Any] {
    return [
      "ok": false,
      "error": [
        "kind": "capture-error",
        "code": "configuration_unavailable",
        "message": unavailableMessage,
        "retryable": true,
        "recoveryAction": "retry"
      ]
    ]
  }
}

final class CaptureBoundaryEventSequence {
  private var currentStateKind: String?
  private var sequence = 0

  func stateChanged(to state: [String: Any]) -> [String: Any]? {
    guard let stateKind = state["kind"] as? String else {
      return nil
    }

    guard stateKind != currentStateKind else {
      return nil
    }

    currentStateKind = stateKind
    sequence += 1

    return [
      "kind": "state-changed",
      "sequence": sequence,
      "state": state
    ]
  }

  func invalidateCurrentState() {
    currentStateKind = nil
  }
}
