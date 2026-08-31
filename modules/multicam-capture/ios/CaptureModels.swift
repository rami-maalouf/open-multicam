import Foundation

enum CaptureMode: String, Equatable {
  case single
  case discrete
  case pip
  case split
}

enum CaptureOutput: String, Equatable {
  case singleFile = "single-file"
  case dualFiles = "dual-files"
  case compositeFile = "composite-file"
}

enum CaptureOrientation: String, Equatable {
  case portrait
  case landscape
}

enum CaptureStopReason: String, Equatable {
  case userRequested = "user-requested"
  case storageCritical = "storage-critical"
  case systemPressureCritical = "system-pressure-critical"
  case backgrounded
  case audioRouteLost = "audio-route-lost"
  case mediaServicesReset = "media-services-reset"
  case writerFailed = "writer-failed"
}

struct CapturePreset: Equatable {
  let configurationId: String
  let mode: CaptureMode
  let output: CaptureOutput
  let cameraAId: String
  let cameraBId: String?
  let orientation: CaptureOrientation
  let width: Int
  let height: Int
  let frameRate: Int
  let bitrate: Int
  let stabilization: String

  var payload: [String: Any] {
    var result: [String: Any] = [
      "configurationId": configurationId,
      "mode": mode.rawValue,
      "output": output.rawValue,
      "cameraAId": cameraAId,
      "orientation": orientation.rawValue,
      "profile": "core1080p",
      "width": width,
      "height": height,
      "frameRate": frameRate,
      "codec": "h264",
      "bitrate": bitrate,
      "stabilization": stabilization
    ]

    if let cameraBId {
      result["cameraBId"] = cameraBId
    }

    return result
  }
}

struct CaptureFailure: Error, Equatable {
  let code: String
  let message: String
  let retryable: Bool
  let recoveryAction: String

  static let invalidStateTransition = CaptureFailure(
    code: "invalid_state_transition",
    message: "The camera is not ready for that action.",
    retryable: true,
    recoveryAction: "retry"
  )

  var payload: [String: Any] {
    [
      "kind": "capture-error",
      "code": code,
      "message": message,
      "retryable": retryable,
      "recoveryAction": recoveryAction
    ]
  }

  var resultPayload: [String: Any] {
    ["ok": false, "error": payload]
  }
}

struct ValidatedRecordingOutput: Equatable {
  let durationMs: Int
  let assetCount: Int

  init?(
    durationMs: Int,
    expectedAssetCount: Int,
    playableAssetCount: Int
  ) {
    guard durationMs > 0 else {
      return nil
    }

    guard expectedAssetCount > 0 else {
      return nil
    }

    guard playableAssetCount == expectedAssetCount else {
      return nil
    }

    self.durationMs = durationMs
    self.assetCount = playableAssetCount
  }
}

enum CaptureState: Equatable {
  case idle
  case configuring(requestId: String)
  case previewing(preset: CapturePreset)
  case preparing(recordingSetId: String, preset: CapturePreset)
  case ready(recordingSetId: String, preset: CapturePreset)
  case starting(recordingSetId: String, preset: CapturePreset)
  case recording(recordingSetId: String, preset: CapturePreset, startedAtMs: Double)
  case stopping(recordingSetId: String, reason: CaptureStopReason)
  case finalizing(recordingSetId: String)
  case completed(recordingSetId: String, durationMs: Int)
  case interrupted(recordingSetId: String?, reason: CaptureStopReason, recoverable: Bool)
  case recoverable(recordingSetId: String, reason: CaptureStopReason, playableAssetCount: Int)
  case failed(recordingSetId: String?, error: CaptureFailure)

  var isTerminal: Bool {
    switch self {
    case .completed, .interrupted, .recoverable, .failed:
      true
    default:
      false
    }
  }

  var recordingSetId: String? {
    switch self {
    case let .preparing(recordingSetId, _),
         let .ready(recordingSetId, _),
         let .starting(recordingSetId, _),
         let .recording(recordingSetId, _, _),
         let .stopping(recordingSetId, _),
         let .finalizing(recordingSetId),
         let .completed(recordingSetId, _),
         let .recoverable(recordingSetId, _, _):
      recordingSetId
    case let .interrupted(recordingSetId, _, _),
         let .failed(recordingSetId, _):
      recordingSetId
    case .idle, .configuring, .previewing:
      nil
    }
  }

  var payload: [String: Any] {
    switch self {
    case .idle:
      return ["kind": "idle"]
    case let .configuring(requestId):
      return ["kind": "configuring", "requestId": requestId]
    case let .previewing(preset):
      return ["kind": "previewing", "preset": preset.payload]
    case let .preparing(recordingSetId, preset):
      return [
        "kind": "preparing",
        "recordingSetId": recordingSetId,
        "preset": preset.payload
      ]
    case let .ready(recordingSetId, preset):
      return [
        "kind": "ready",
        "recordingSetId": recordingSetId,
        "preset": preset.payload
      ]
    case let .starting(recordingSetId, preset):
      return [
        "kind": "starting",
        "recordingSetId": recordingSetId,
        "preset": preset.payload
      ]
    case let .recording(recordingSetId, preset, startedAtMs):
      return [
        "kind": "recording",
        "recordingSetId": recordingSetId,
        "preset": preset.payload,
        "startedAtMs": startedAtMs
      ]
    case let .stopping(recordingSetId, reason):
      return [
        "kind": "stopping",
        "recordingSetId": recordingSetId,
        "reason": reason.rawValue
      ]
    case let .finalizing(recordingSetId):
      return ["kind": "finalizing", "recordingSetId": recordingSetId]
    case let .completed(recordingSetId, durationMs):
      return [
        "kind": "completed",
        "recordingSetId": recordingSetId,
        "durationMs": durationMs
      ]
    case let .interrupted(recordingSetId, reason, recoverable):
      var result: [String: Any] = [
        "kind": "interrupted",
        "reason": reason.rawValue,
        "recoverable": recoverable
      ]
      if let recordingSetId {
        result["recordingSetId"] = recordingSetId
      }
      return result
    case let .recoverable(recordingSetId, reason, playableAssetCount):
      return [
        "kind": "recoverable",
        "recordingSetId": recordingSetId,
        "reason": reason.rawValue,
        "playableAssetCount": playableAssetCount
      ]
    case let .failed(recordingSetId, error):
      var result: [String: Any] = [
        "kind": "failed",
        "error": error.payload
      ]
      if let recordingSetId {
        result["recordingSetId"] = recordingSetId
      }
      return result
    }
  }
}
