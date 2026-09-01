import AVFoundation
import Foundation

struct CaptureRecordingCamera {
  let id: String
  let label: String
  let position: String

  var payload: [String: Any] {
    ["id": id, "label": label, "position": position]
  }
}

struct CaptureRecordingClipPlan {
  let id: String
  let role: String
  let relativePath: String
  let fileURL: URL
}

struct CaptureRecordingContext {
  let recordingSetId: String
  let createdAtUtcMs: Int
  let stagingURL: URL
  let preset: CapturePreset
  let cameraA: CaptureRecordingCamera
  let cameraB: CaptureRecordingCamera?
  let clips: [CaptureRecordingClipPlan]
  let expectsAudio: Bool
}

struct CaptureWriterResult {
  let durationMs: Int
  let startedAtPtsSeconds: Double
  let hasAudio: Bool
}

struct CaptureFinalizedRecording {
  let manifest: [String: Any]
  let durationMs: Int
  let assetCount: Int
}

enum CaptureRecordingStorage {
  static func prepare(
    recordingSetId: String,
    preset: CapturePreset,
    devices: [AVCaptureDevice],
    expectsAudio: Bool
  ) throws -> CaptureRecordingContext {
    let stagingURL = try stagingRoot()
      .appendingPathComponent(recordingSetId, isDirectory: true)
    try FileManager.default.createDirectory(
      at: stagingURL,
      withIntermediateDirectories: true
    )

    guard let cameraADevice = devices.first else {
      throw CaptureFailure.configurationUnavailable
    }

    let roles = preset.mode == .single
      ? [("single", "single.mp4")]
      : [("cameraA", "camera-a.mp4"), ("cameraB", "camera-b.mp4")]
    let clips = roles.map { role, filename in
      CaptureRecordingClipPlan(
        id: "\(recordingSetId)-\(role)",
        role: role,
        relativePath: filename,
        fileURL: stagingURL.appendingPathComponent(filename)
      )
    }

    return CaptureRecordingContext(
      recordingSetId: recordingSetId,
      createdAtUtcMs: Int(Date().timeIntervalSince1970 * 1_000),
      stagingURL: stagingURL,
      preset: preset,
      cameraA: recordingCamera(cameraADevice),
      cameraB: devices.count > 1 ? recordingCamera(devices[1]) : nil,
      clips: clips,
      expectsAudio: expectsAudio
    )
  }

  static func finalize(
    context: CaptureRecordingContext,
    writerResult: CaptureWriterResult
  ) async throws -> CaptureFinalizedRecording {
    var clipPayloads: [[String: Any]] = []

    for clip in context.clips {
      clipPayloads.append(
        try await validate(
          clip: clip,
          preset: context.preset,
          fallbackDurationMs: writerResult.durationMs
        )
      )
    }

    let presetPayload: [String: Any] = [
      "profile": "core1080p",
      "orientation": context.preset.orientation.rawValue,
      "width": context.preset.width,
      "height": context.preset.height,
      "frameRate": context.preset.frameRate,
      "codec": "h264",
      "bitrate": context.preset.bitrate,
      "stabilization": context.preset.stabilization
    ]
    let audioPayload: [String: Any]
    if writerResult.hasAudio {
      audioPayload = [
        "kind": "present",
        "route": [
          "label": "iPhone Microphone",
          "channelCount": 1,
          "sampleRateHz": 44_100
        ]
      ]
    } else {
      audioPayload = [
        "kind": "absent",
        "reason": "permission-not-granted"
      ]
    }
    let outcomePayload: [String: Any] = [
      "kind": "ready",
      "durationMs": writerResult.durationMs,
      "finalizedAtUtcMs": Int(Date().timeIntervalSince1970 * 1_000)
    ]
    var manifest: [String: Any] = [
      "kind": "recording-set-manifest",
      "schemaVersion": 1,
      "recordingSetId": context.recordingSetId,
      "name": NSNull(),
      "createdAtUtcMs": context.createdAtUtcMs,
      "startedAtPtsSeconds": writerResult.startedAtPtsSeconds,
      "preset": presetPayload,
      "audio": audioPayload,
      "warnings": [],
      "outcome": outcomePayload,
      "mode": context.preset.mode.rawValue,
      "cameraA": context.cameraA.payload,
      "clips": clipPayloads
    ]

    if let cameraB = context.cameraB {
      manifest["cameraB"] = cameraB.payload
    }

    let manifestURL = context.stagingURL.appendingPathComponent("manifest.json")
    let manifestData = try JSONSerialization.data(
      withJSONObject: manifest,
      options: [.prettyPrinted, .sortedKeys]
    )
    try manifestData.write(to: manifestURL, options: .atomic)

    let destination = try recordingsRoot()
      .appendingPathComponent(context.recordingSetId, isDirectory: true)
    try FileManager.default.moveItem(at: context.stagingURL, to: destination)

    return CaptureFinalizedRecording(
      manifest: manifest,
      durationMs: writerResult.durationMs,
      assetCount: clipPayloads.count
    )
  }

  static func listRecordings() throws -> [[String: Any]] {
    try recoverReadyStagingDirectories()
    let root = try recordingsRoot()
    let directories = try FileManager.default.contentsOfDirectory(
      at: root,
      includingPropertiesForKeys: nil,
      options: [.skipsHiddenFiles]
    )

    return try directories.compactMap { directory in
      let manifestURL = directory.appendingPathComponent("manifest.json")
      guard FileManager.default.fileExists(atPath: manifestURL.path) else {
        return nil
      }

      let data = try Data(contentsOf: manifestURL)
      guard var manifest = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        return nil
      }
      guard let clips = manifest["clips"] as? [[String: Any]] else {
        return nil
      }

      manifest["directoryUri"] = directory.absoluteString
      manifest["clipUris"] = clips.compactMap { clip -> [String: Any]? in
        guard
          let id = clip["id"] as? String,
          let relativePath = clip["relativePath"] as? String
        else {
          return nil
        }
        return [
          "clipId": id,
          "uri": directory.appendingPathComponent(relativePath).absoluteString
        ]
      }
      return manifest
    }
    .sorted {
      ($0["createdAtUtcMs"] as? Int ?? 0) >
        ($1["createdAtUtcMs"] as? Int ?? 0)
    }
  }

  static func deleteRecording(recordingSetId: String) throws {
    let directory = try recordingDirectory(recordingSetId: recordingSetId)
    guard FileManager.default.fileExists(atPath: directory.path) else {
      throw CaptureFailure.recordingNotFound
    }
    try FileManager.default.removeItem(at: directory)
  }

  static func renameRecording(
    recordingSetId: String,
    name: String
  ) throws -> [String: Any] {
    let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedName.isEmpty, trimmedName.count <= 120 else {
      throw CaptureFailure.invalidRecordingName
    }

    let directory = try recordingDirectory(recordingSetId: recordingSetId)
    let manifestURL = directory.appendingPathComponent("manifest.json")
    guard FileManager.default.fileExists(atPath: manifestURL.path) else {
      throw CaptureFailure.recordingNotFound
    }

    let data = try Data(contentsOf: manifestURL)
    guard var manifest = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      throw CaptureFailure.recordingCorrupt
    }
    manifest["name"] = trimmedName
    let updated = try JSONSerialization.data(
      withJSONObject: manifest,
      options: [.prettyPrinted, .sortedKeys]
    )
    try updated.write(to: manifestURL, options: .atomic)
    return manifest
  }

  private static func validate(
    clip: CaptureRecordingClipPlan,
    preset: CapturePreset,
    fallbackDurationMs: Int
  ) async throws -> [String: Any] {
    let asset = AVURLAsset(url: clip.fileURL)
    let playable = try await asset.load(.isPlayable)
    let videoTracks = try await asset.loadTracks(withMediaType: .video)
    let audioTracks = try await asset.loadTracks(withMediaType: .audio)
    let duration = try await asset.load(.duration)

    guard playable, videoTracks.count == 1, audioTracks.count <= 1 else {
      throw CaptureFailure.recordingValidationFailed
    }

    let resourceValues = try clip.fileURL.resourceValues(forKeys: [.fileSizeKey])
    let measuredDurationMs = Int(CMTimeGetSeconds(duration) * 1_000)

    return [
      "id": clip.id,
      "role": clip.role,
      "relativePath": clip.relativePath,
      "status": "ready",
      "media": [
        "width": preset.width,
        "height": preset.height,
        "durationMs": max(1, max(measuredDurationMs, fallbackDurationMs)),
        "fileSizeBytes": resourceValues.fileSize ?? 0,
        "videoTrackCount": 1,
        "audioTrackCount": audioTracks.count,
        "playable": true
      ],
      "issue": NSNull()
    ]
  }

  private static func recordingCamera(
    _ device: AVCaptureDevice
  ) -> CaptureRecordingCamera {
    let position: String
    switch device.position {
    case .front:
      position = "front"
    case .back:
      position = "back"
    default:
      position = "unspecified"
    }
    return CaptureRecordingCamera(
      id: device.uniqueID,
      label: device.localizedName,
      position: position
    )
  }

  private static func recoverReadyStagingDirectories() throws {
    let stagingDirectories = try FileManager.default.contentsOfDirectory(
      at: stagingRoot(),
      includingPropertiesForKeys: nil,
      options: [.skipsHiddenFiles]
    )
    let destinationRoot = try recordingsRoot()

    for stagingDirectory in stagingDirectories {
      let recordingSetId = stagingDirectory.lastPathComponent.lowercased()
      guard UUID(uuidString: recordingSetId) != nil else {
        continue
      }

      let destination = destinationRoot.appendingPathComponent(
        recordingSetId,
        isDirectory: true
      )
      guard !FileManager.default.fileExists(atPath: destination.path) else {
        continue
      }

      let manifestURL = stagingDirectory.appendingPathComponent("manifest.json")
      guard
        let data = try? Data(contentsOf: manifestURL),
        let manifest = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        (manifest["schemaVersion"] as? Int) == 1,
        (manifest["recordingSetId"] as? String)?.lowercased() == recordingSetId,
        let outcome = manifest["outcome"] as? [String: Any],
        (outcome["kind"] as? String) == "ready",
        let clips = manifest["clips"] as? [[String: Any]],
        !clips.isEmpty,
        clips.allSatisfy({ clip in
          guard let relativePath = clip["relativePath"] as? String else {
            return false
          }
          let filename = (relativePath as NSString).lastPathComponent
          guard
            filename == relativePath,
            filename != ".",
            filename != ".."
          else {
            return false
          }
          return FileManager.default.fileExists(
            atPath: stagingDirectory.appendingPathComponent(relativePath).path
          )
        })
      else {
        continue
      }

      try FileManager.default.moveItem(at: stagingDirectory, to: destination)
    }
  }

  private static func applicationSupportRoot() throws -> URL {
    let documents = try FileManager.default.url(
      for: .documentDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let root = documents.appendingPathComponent("OpenMulticam", isDirectory: true)
    try FileManager.default.createDirectory(
      at: root,
      withIntermediateDirectories: true
    )
    return root
  }

  private static func stagingRoot() throws -> URL {
    let root = try applicationSupportRoot()
      .appendingPathComponent("Staging", isDirectory: true)
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    return root
  }

  private static func recordingsRoot() throws -> URL {
    let root = try applicationSupportRoot()
      .appendingPathComponent("Recordings", isDirectory: true)
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    return root
  }

  private static func recordingDirectory(recordingSetId: String) throws -> URL {
    guard UUID(uuidString: recordingSetId) != nil else {
      throw CaptureFailure.invalidRequest
    }
    return try recordingsRoot()
      .appendingPathComponent(recordingSetId.lowercased(), isDirectory: true)
  }
}
