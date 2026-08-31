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

    AsyncFunction("startRecording") { () async -> [String: Any] in
      let recordingSetId = UUID().uuidString.lowercased()
      let preparation = self.stateMachine.send(
        .beginPreparation(recordingSetId: recordingSetId)
      )
      self.publish(preparation)
      guard case .accepted = preparation else {
        return self.resultPayload(for: preparation)
      }

      let prepared = await CaptureSessionService.shared.prepareRecording(
        recordingSetId: recordingSetId
      )

      switch prepared {
      case let .failure(failure):
        self.publish(self.stateMachine.send(.fail(failure)))
        return failure.resultPayload
      case .success:
        let ready = self.stateMachine.send(.finishPreparation)
        self.publish(ready)
        let starting = self.stateMachine.send(.beginRecording)
        self.publish(starting)
        guard case .accepted = starting else {
          return self.resultPayload(for: starting)
        }

        let recording = self.stateMachine.send(
          .confirmRecordingStarted(
            startedAtMs: Date().timeIntervalSince1970 * 1_000
          )
        )
        self.publish(recording)
        return [
          "ok": true,
          "value": ["recordingSetId": recordingSetId]
        ]
      }
    }

    AsyncFunction("stopRecording") { () async -> [String: Any] in
      let stopping = self.stateMachine.send(
        .requestStop(reason: .userRequested)
      )
      self.publish(stopping)
      guard case .accepted = stopping else {
        return self.resultPayload(for: stopping)
      }

      let finalizing = self.stateMachine.send(.beginFinalization)
      self.publish(finalizing)

      switch await CaptureSessionService.shared.stopRecording() {
      case let .failure(failure):
        self.publish(self.stateMachine.send(.fail(failure)))
        return failure.resultPayload
      case let .success(finalized):
        guard let output = ValidatedRecordingOutput(
          durationMs: finalized.durationMs,
          expectedAssetCount: finalized.assetCount,
          playableAssetCount: finalized.assetCount
        ) else {
          let failure = CaptureFailure.recordingValidationFailed
          self.publish(self.stateMachine.send(.fail(failure)))
          return failure.resultPayload
        }
        self.publish(self.stateMachine.send(.complete(output: output)))
        return ["ok": true, "value": finalized.manifest]
      }
    }

    AsyncFunction("listRecordings") { () -> [[String: Any]] in
      try CaptureRecordingStorage.listRecordings()
    }

    AsyncFunction("deleteRecording") { (recordingSetId: String) -> Bool in
      try CaptureRecordingStorage.deleteRecording(recordingSetId: recordingSetId)
      return true
    }

    AsyncFunction("renameRecording") {
      (recordingSetId: String, name: String) -> [String: Any] in
      try CaptureRecordingStorage.renameRecording(
        recordingSetId: recordingSetId,
        name: name
      )
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
