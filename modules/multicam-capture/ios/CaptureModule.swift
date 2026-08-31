import ExpoModulesCore

public final class CaptureModule: Module {
  private let eventSequence = CaptureBoundaryEventSequence()
  private let stateMachine = CaptureStateMachine()

  public func definition() -> ModuleDefinition {
    Name("MulticamCapture")

    Events("onCaptureEvent")

    AsyncFunction("discoverCapabilities") { () -> [String: Any] in
      CaptureDeviceDiscovery.capabilities(isSimulator: Self.isSimulator)
    }

    AsyncFunction("getPermissionStatus") { () -> [String: Any] in
      CapturePermissions.statusPayload()
    }

    AsyncFunction("requestCameraPermission") { () async -> [String: Any] in
      await CapturePermissions.requestCamera()
    }

    AsyncFunction("requestMicrophonePermission") { () async -> [String: Any] in
      await CapturePermissions.requestMicrophone()
    }

    AsyncFunction("openSettings") { () async -> Bool in
      await CapturePermissions.openSettings()
    }

    AsyncFunction("configure") { (request: [String: Any]) async -> [String: Any] in
      self.teardownTerminalState()
      let requestId = request["configurationId"] as? String ?? UUID().uuidString
      let transition = self.stateMachine.send(
        .beginConfiguration(requestId: requestId)
      )

      guard case .accepted = transition else {
        return self.resultPayload(for: transition)
      }

      self.publish(transition)
      let result = await CaptureSessionService.shared.configure(
        request: request,
        isSimulator: Self.isSimulator
      )

      switch result {
      case let .success(preset):
        let completed = self.stateMachine.send(.finishConfiguration(preset: preset))
        self.publish(completed)
        return self.resultPayload(for: completed)
      case let .failure(failure):
        self.publish(self.stateMachine.send(.fail(failure)))
        return failure.resultPayload
      }
    }

    AsyncFunction("startRecording") { () -> [String: Any] in
      let transition = self.stateMachine.send(.beginRecording)
      self.publish(transition)
      return self.resultPayload(for: transition)
    }

    AsyncFunction("stopRecording") { () -> [String: Any] in
      let transition = self.stateMachine.send(
        .requestStop(reason: .userRequested)
      )
      self.publish(transition)
      return self.resultPayload(for: transition)
    }

    View(CaptureSurfaceView.self) {
      Events("onCaptureEvent")
    }

    OnAppEntersBackground {
      self.publish(
        self.stateMachine.send(
          .interrupt(reason: .backgrounded, recoverable: false)
        )
      )
    }

    OnDestroy {
      CaptureSessionService.shared.tearDown()
      self.publish(self.stateMachine.send(.teardown))
    }
  }

  private var unavailableFailure: CaptureFailure {
    CaptureFailure(
      code: "configuration_unavailable",
      message: CaptureBoundaryPayloads.unavailableMessage,
      retryable: true,
      recoveryAction: "retry"
    )
  }

  private func teardownTerminalState() {
    guard stateMachine.state.isTerminal else {
      return
    }

    publish(stateMachine.send(.teardown))
  }

  private func publish(_ result: CaptureTransitionResult) {
    guard case let .accepted(_, current) = result else {
      return
    }

    guard let event = eventSequence.stateChanged(to: current.payload) else {
      return
    }

    sendEvent("onCaptureEvent", event)
  }

  private func resultPayload(
    for transition: CaptureTransitionResult
  ) -> [String: Any] {
    switch transition {
    case let .accepted(_, current):
      return ["ok": true, "value": current.payload]
    case let .rejected(error):
      return error.resultPayload
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
