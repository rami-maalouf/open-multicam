import ExpoModulesCore

public final class CaptureModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MulticamCapture")

    Events("onCaptureEvent")

    AsyncFunction("discoverCapabilities") { () -> [String: Any] in
      CaptureDeviceDiscovery.capabilities(isSimulator: Self.isSimulator)
    }

    AsyncFunction("configure") { (_: [String: Any]) -> [String: Any] in
      CaptureBoundaryPayloads.unavailableResult()
    }

    AsyncFunction("startRecording") { () -> [String: Any] in
      CaptureBoundaryPayloads.unavailableResult()
    }

    AsyncFunction("stopRecording") { () -> [String: Any] in
      CaptureBoundaryPayloads.unavailableResult()
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
