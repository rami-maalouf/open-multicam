import Foundation

enum CaptureTransition: Equatable {
  case beginConfiguration(requestId: String)
  case finishConfiguration(preset: CapturePreset)
  case beginPreparation(recordingSetId: String)
  case finishPreparation
  case beginRecording
  case confirmRecordingStarted(startedAtMs: Double)
  case requestStop(reason: CaptureStopReason)
  case beginFinalization
  case complete(output: ValidatedRecordingOutput)
  case interrupt(reason: CaptureStopReason, recoverable: Bool)
  case markRecoverable(reason: CaptureStopReason, playableAssetCount: Int)
  case fail(CaptureFailure)
  case teardown
}

enum CaptureTransitionResult: Equatable {
  case accepted(previous: CaptureState, current: CaptureState)
  case rejected(CaptureFailure)
}

final class CaptureStateMachine {
  private let lock = NSLock()
  private var storedState: CaptureState

  init(initialState: CaptureState = .idle) {
    storedState = initialState
  }

  var state: CaptureState {
    lock.lock()
    defer { lock.unlock() }
    return storedState
  }

  func send(_ transition: CaptureTransition) -> CaptureTransitionResult {
    lock.lock()
    defer { lock.unlock() }

    let previous = storedState

    switch resolve(transition, from: previous) {
    case let .success(current):
      storedState = current
      return .accepted(previous: previous, current: current)
    case let .failure(error):
      return .rejected(error)
    }
  }

  private func resolve(
    _ transition: CaptureTransition,
    from state: CaptureState
  ) -> Result<CaptureState, CaptureFailure> {
    if state.isTerminal {
      guard transition == .teardown else {
        return .failure(.invalidStateTransition)
      }

      return .success(.idle)
    }

    switch transition {
    case .teardown:
      guard state != .idle else {
        return .failure(.invalidStateTransition)
      }
      return .success(.idle)

    case let .fail(error):
      return .success(.failed(recordingSetId: state.recordingSetId, error: error))

    case let .interrupt(reason, recoverable):
      guard state != .idle else {
        return .failure(.invalidStateTransition)
      }
      return .success(
        .interrupted(
          recordingSetId: state.recordingSetId,
          reason: reason,
          recoverable: recoverable
        )
      )

    case let .markRecoverable(reason, playableAssetCount):
      guard playableAssetCount > 0 else {
        return .failure(.invalidStateTransition)
      }

      switch state {
      case let .finalizing(recordingSetId):
        return .success(
          .recoverable(
            recordingSetId: recordingSetId,
            reason: reason,
            playableAssetCount: playableAssetCount
          )
        )
      default:
        return .failure(.invalidStateTransition)
      }

    case let .beginConfiguration(requestId):
      switch state {
      case .idle, .previewing:
        return .success(.configuring(requestId: requestId))
      default:
        return .failure(.invalidStateTransition)
      }

    case let .finishConfiguration(preset):
      guard case .configuring = state else {
        return .failure(.invalidStateTransition)
      }
      return .success(.previewing(preset: preset))

    case let .beginPreparation(recordingSetId):
      guard case let .previewing(preset) = state else {
        return .failure(.invalidStateTransition)
      }
      return .success(
        .preparing(recordingSetId: recordingSetId, preset: preset)
      )

    case .finishPreparation:
      guard case let .preparing(recordingSetId, preset) = state else {
        return .failure(.invalidStateTransition)
      }
      return .success(.ready(recordingSetId: recordingSetId, preset: preset))

    case .beginRecording:
      guard case let .ready(recordingSetId, preset) = state else {
        return .failure(.invalidStateTransition)
      }
      return .success(.starting(recordingSetId: recordingSetId, preset: preset))

    case let .confirmRecordingStarted(startedAtMs):
      guard case let .starting(recordingSetId, preset) = state else {
        return .failure(.invalidStateTransition)
      }
      return .success(
        .recording(
          recordingSetId: recordingSetId,
          preset: preset,
          startedAtMs: startedAtMs
        )
      )

    case let .requestStop(reason):
      guard case let .recording(recordingSetId, _, _) = state else {
        return .failure(.invalidStateTransition)
      }
      return .success(.stopping(recordingSetId: recordingSetId, reason: reason))

    case .beginFinalization:
      guard case let .stopping(recordingSetId, _) = state else {
        return .failure(.invalidStateTransition)
      }
      return .success(.finalizing(recordingSetId: recordingSetId))

    case let .complete(output):
      guard case let .finalizing(recordingSetId) = state else {
        return .failure(.invalidStateTransition)
      }
      return .success(
        .completed(
          recordingSetId: recordingSetId,
          durationMs: output.durationMs
        )
      )
    }
  }
}
