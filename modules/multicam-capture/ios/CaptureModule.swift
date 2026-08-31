import ExpoModulesCore

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

public final class CaptureModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MulticamCapture")

    Events("onCaptureEvent")

    AsyncFunction("discoverCapabilities") { () -> [String: Any] in
      CaptureBoundaryPayloads.deviceCapabilities(
        discoveredAtMs: Date().timeIntervalSince1970 * 1_000,
        isSimulator: Self.isSimulator
      )
    }

    AsyncFunction("configure") { (_: [String: Any]) -> [String: Any] in
      CaptureBoundaryPayloads.unavailableResult(isSimulator: Self.isSimulator)
    }

    AsyncFunction("startRecording") { () -> [String: Any] in
      CaptureBoundaryPayloads.unavailableResult(isSimulator: Self.isSimulator)
    }

    AsyncFunction("stopRecording") { () -> [String: Any] in
      CaptureBoundaryPayloads.unavailableResult(isSimulator: Self.isSimulator)
    }

    View(CaptureSurfaceView.self) {
      Events("onCaptureEvent")
    }
  }

  private static var isSimulator: Bool {
#if targetEnvironment(simulator)
    true
#else
    false
#endif
  }
}
