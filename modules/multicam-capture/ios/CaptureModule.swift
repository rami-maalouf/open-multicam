import ExpoModulesCore

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
