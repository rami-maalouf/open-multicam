import Foundation

enum CaptureBoundaryPayloads {
  static let simulatorMessage = "Multicamera capture requires a physical iPhone."
  static let unavailableMessage = "Camera discovery is not active yet."

  static func deviceCapabilities(
    discoveredAtMs: Double,
    isSimulator: Bool
  ) -> [String: Any] {
    let reason: [String: Any] = isSimulator
      ? ["kind": "multicam-unsupported", "message": simulatorMessage]
      : ["kind": "camera-unavailable", "message": unavailableMessage]

    return [
      "kind": "device-capabilities",
      "schemaVersion": 1,
      "discoveredAtMs": discoveredAtMs,
      "cameras": [[String: Any]](),
      "multicam": ["kind": "unsupported", "reason": reason],
      "configurations": [[String: Any]]()
    ]
  }

  static func unavailableResult(isSimulator: Bool) -> [String: Any] {
    let code = isSimulator ? "multicam_unsupported" : "configuration_unavailable"
    let message = isSimulator ? simulatorMessage : unavailableMessage
    let recoveryAction = isSimulator ? "select-configuration" : "retry"

    return [
      "ok": false,
      "error": [
        "kind": "capture-error",
        "code": code,
        "message": message,
        "retryable": !isSimulator,
        "recoveryAction": recoveryAction
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
}
