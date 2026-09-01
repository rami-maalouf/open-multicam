import XCTest
@testable import MulticamCaptureBoundary

final class CaptureStateMachineTests: XCTestCase {
  private let preset = CapturePreset(
    configurationId: "dual-wide-front-30",
    mode: .discrete,
    output: .dualFiles,
    cameraAId: "back-wide",
    cameraBId: "front-wide",
    orientation: .landscape,
    width: 1_920,
    height: 1_080,
    frameRate: 30,
    bitrate: 24_000_000,
    stabilization: "standard"
  )

  func testHappyPathRequiresValidatedAssetsAndExplicitTeardown() throws {
    let machine = CaptureStateMachine()

    assertAccepted(
      machine.send(.beginConfiguration(requestId: "request-1")),
      current: .configuring(requestId: "request-1")
    )
    assertAccepted(
      machine.send(.finishConfiguration(preset: preset)),
      current: .previewing(preset: preset)
    )
    assertAccepted(
      machine.send(.beginPreparation(recordingSetId: "set-1")),
      current: .preparing(recordingSetId: "set-1", preset: preset)
    )
    assertAccepted(
      machine.send(.finishPreparation),
      current: .ready(recordingSetId: "set-1", preset: preset)
    )
    assertAccepted(
      machine.send(.beginRecording),
      current: .starting(recordingSetId: "set-1", preset: preset)
    )
    assertAccepted(
      machine.send(.confirmRecordingStarted(startedAtMs: 2_500)),
      current: .recording(
        recordingSetId: "set-1",
        preset: preset,
        startedAtMs: 2_500
      )
    )
    assertAccepted(
      machine.send(.requestStop(reason: .userRequested)),
      current: .stopping(recordingSetId: "set-1", reason: .userRequested)
    )
    assertAccepted(
      machine.send(.beginFinalization),
      current: .finalizing(recordingSetId: "set-1")
    )

    XCTAssertNil(
      ValidatedRecordingOutput(
        durationMs: 0,
        expectedAssetCount: 2,
        playableAssetCount: 2
      )
    )
    XCTAssertNil(
      ValidatedRecordingOutput(
        durationMs: 1_000,
        expectedAssetCount: 0,
        playableAssetCount: 0
      )
    )
    XCTAssertNil(
      ValidatedRecordingOutput(
        durationMs: 1_000,
        expectedAssetCount: 2,
        playableAssetCount: 1
      )
    )
    let output = try XCTUnwrap(
      ValidatedRecordingOutput(
        durationMs: 1_000,
        expectedAssetCount: 2,
        playableAssetCount: 2
      )
    )
    XCTAssertEqual(output.assetCount, 2)

    assertAccepted(
      machine.send(.complete(output: output)),
      current: .completed(recordingSetId: "set-1", durationMs: 1_000)
    )
    assertRejected(machine.send(.beginConfiguration(requestId: "request-2")))
    assertAccepted(machine.send(.teardown), current: .idle)
  }

  func testIllegalTransitionsNeverMutateState() throws {
    let output = try XCTUnwrap(
      ValidatedRecordingOutput(
        durationMs: 1_000,
        expectedAssetCount: 1,
        playableAssetCount: 1
      )
    )
    let transitions: [CaptureTransition] = [
      .finishConfiguration(preset: preset),
      .beginPreparation(recordingSetId: "set-1"),
      .finishPreparation,
      .beginRecording,
      .confirmRecordingStarted(startedAtMs: 1),
      .requestStop(reason: .writerFailed),
      .beginFinalization,
      .complete(output: output),
      .interrupt(reason: .backgrounded, recoverable: false),
      .markRecoverable(reason: .writerFailed, playableAssetCount: 0),
      .markRecoverable(reason: .writerFailed, playableAssetCount: 1),
      .teardown
    ]

    for transition in transitions {
      let machine = CaptureStateMachine()
      let before = machine.state

      assertRejected(machine.send(transition))
      XCTAssertEqual(machine.state, before)
    }

    let configuringMachine = CaptureStateMachine(
      initialState: .configuring(requestId: "request-1")
    )
    assertRejected(
      configuringMachine.send(.beginConfiguration(requestId: "request-2"))
    )
  }

  func testPreviewCanReconfigureWhileRecordingStatesRejectIt() {
    let previewMachine = CaptureStateMachine(
      initialState: .previewing(preset: preset)
    )
    assertAccepted(
      previewMachine.send(.beginConfiguration(requestId: "switch-camera")),
      current: .configuring(requestId: "switch-camera")
    )

    let recordingStates: [CaptureState] = [
      .preparing(recordingSetId: "set-1", preset: preset),
      .ready(recordingSetId: "set-1", preset: preset),
      .starting(recordingSetId: "set-1", preset: preset),
      .recording(recordingSetId: "set-1", preset: preset, startedAtMs: 1),
      .stopping(recordingSetId: "set-1", reason: .userRequested),
      .finalizing(recordingSetId: "set-1")
    ]

    for state in recordingStates {
      let machine = CaptureStateMachine(initialState: state)
      assertRejected(
        machine.send(.beginConfiguration(requestId: "switch-camera"))
      )
      XCTAssertEqual(machine.state, state)
    }
  }

  func testFailureAndInterruptionPreserveRecordingIdentity() {
    let failure = CaptureFailure(
      code: "writer_not_ready",
      message: "Recording is still preparing.",
      retryable: true,
      recoveryAction: "retry"
    )
    let preparing = CaptureState.preparing(
      recordingSetId: "set-1",
      preset: preset
    )
    let failedMachine = CaptureStateMachine(initialState: preparing)
    let interruptedMachine = CaptureStateMachine(initialState: preparing)

    assertAccepted(
      failedMachine.send(.fail(failure)),
      current: .failed(recordingSetId: "set-1", error: failure)
    )
    assertAccepted(
      interruptedMachine.send(
        .interrupt(reason: .mediaServicesReset, recoverable: true)
      ),
      current: .interrupted(
        recordingSetId: "set-1",
        reason: .mediaServicesReset,
        recoverable: true
      )
    )
  }

  func testRecoverableOutputRequiresFinalizationAndPlayableAssets() {
    let machine = CaptureStateMachine(
      initialState: .finalizing(recordingSetId: "set-1")
    )

    assertRejected(
      machine.send(
        .markRecoverable(reason: .writerFailed, playableAssetCount: 0)
      )
    )
    assertAccepted(
      machine.send(
        .markRecoverable(reason: .writerFailed, playableAssetCount: 1)
      ),
      current: .recoverable(
        recordingSetId: "set-1",
        reason: .writerFailed,
        playableAssetCount: 1
      )
    )
  }

  func testEveryTerminalStateRequiresTeardown() {
    let failure = CaptureFailure.invalidStateTransition
    let terminalStates: [CaptureState] = [
      .completed(recordingSetId: "set-1", durationMs: 1_000),
      .interrupted(
        recordingSetId: nil,
        reason: .backgrounded,
        recoverable: false
      ),
      .recoverable(
        recordingSetId: "set-1",
        reason: .writerFailed,
        playableAssetCount: 1
      ),
      .failed(recordingSetId: nil, error: failure)
    ]

    for state in terminalStates {
      let machine = CaptureStateMachine(initialState: state)

      assertRejected(machine.send(.beginConfiguration(requestId: "request")))
      XCTAssertEqual(machine.state, state)
      assertAccepted(machine.send(.teardown), current: .idle)
    }
  }

  func testStatePayloadsMirrorTheTypeScriptBoundary() throws {
    let failure = CaptureFailure.invalidStateTransition
    let states: [CaptureState] = [
      .idle,
      .configuring(requestId: "request-1"),
      .previewing(preset: preset),
      .preparing(recordingSetId: "set-1", preset: preset),
      .ready(recordingSetId: "set-1", preset: preset),
      .starting(recordingSetId: "set-1", preset: preset),
      .recording(recordingSetId: "set-1", preset: preset, startedAtMs: 10),
      .stopping(recordingSetId: "set-1", reason: .storageCritical),
      .finalizing(recordingSetId: "set-1"),
      .completed(recordingSetId: "set-1", durationMs: 1_000),
      .interrupted(
        recordingSetId: nil,
        reason: .audioRouteLost,
        recoverable: false
      ),
      .interrupted(
        recordingSetId: "set-1",
        reason: .systemPressureCritical,
        recoverable: true
      ),
      .recoverable(
        recordingSetId: "set-1",
        reason: .writerFailed,
        playableAssetCount: 1
      ),
      .failed(recordingSetId: nil, error: failure),
      .failed(recordingSetId: "set-1", error: failure)
    ]

    XCTAssertEqual(
      states.compactMap { $0.payload["kind"] as? String },
      [
        "idle",
        "configuring",
        "previewing",
        "preparing",
        "ready",
        "starting",
        "recording",
        "stopping",
        "finalizing",
        "completed",
        "interrupted",
        "interrupted",
        "recoverable",
        "failed",
        "failed"
      ]
    )
    XCTAssertNil(states[10].payload["recordingSetId"])
    XCTAssertEqual(states[11].payload["recordingSetId"] as? String, "set-1")
    XCTAssertNil(states[13].payload["recordingSetId"])
    XCTAssertEqual(states[14].payload["recordingSetId"] as? String, "set-1")

    let presetPayload = try XCTUnwrap(states[2].payload["preset"] as? [String: Any])
    XCTAssertEqual(presetPayload["cameraBId"] as? String, "front-wide")
    let singlePreset = CapturePreset(
      configurationId: "single-wide-30",
      mode: .single,
      output: .singleFile,
      cameraAId: "back-wide",
      cameraBId: nil,
      orientation: .portrait,
      width: 1_080,
      height: 1_920,
      frameRate: 30,
      bitrate: 16_000_000,
      stabilization: "standard"
    )
    XCTAssertNil(singlePreset.payload["cameraBId"])
    XCTAssertEqual(failure.resultPayload["ok"] as? Bool, false)
  }

  func testNonterminalTeardownAndIdleFailure() {
    let previewMachine = CaptureStateMachine(
      initialState: .previewing(preset: preset)
    )
    let failureMachine = CaptureStateMachine()

    assertAccepted(previewMachine.send(.teardown), current: .idle)
    assertAccepted(
      failureMachine.send(.fail(.invalidStateTransition)),
      current: .failed(
        recordingSetId: nil,
        error: .invalidStateTransition
      )
    )
  }

  private func assertAccepted(
    _ result: CaptureTransitionResult,
    current: CaptureState,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    guard case let .accepted(_, discovered) = result else {
      XCTFail("expected an accepted transition", file: file, line: line)
      return
    }

    XCTAssertEqual(discovered, current, file: file, line: line)
  }

  private func assertRejected(
    _ result: CaptureTransitionResult,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    XCTAssertEqual(
      result,
      .rejected(.invalidStateTransition),
      file: file,
      line: line
    )
  }
}
