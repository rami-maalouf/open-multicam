import Foundation
import Dispatch

@main
struct NativeBenchmark {
  static func accepted(_ result: CaptureTransitionResult) {
    guard case .accepted = result else { fatalError("valid transition rejected") }
  }

  @inline(never)
  static func lifecycle(_ iterations: Int) -> String {
    let preset = CapturePreset(
      configurationId: "benchmark", mode: .discrete, output: .dualFiles,
      cameraAId: "back-wide", cameraBId: "front-wide", orientation: .landscape,
      width: 1920, height: 1080, frameRate: 30, bitrate: 24_000_000, stabilization: "standard"
    )
    guard let output = ValidatedRecordingOutput(durationMs: 1000, expectedAssetCount: 2, playableAssetCount: 2) else {
      fatalError("valid output rejected")
    }
    let machine = CaptureStateMachine()
    for index in 0..<iterations {
      let id = "benchmark-\(index)"
      accepted(machine.send(.beginConfiguration(requestId: id)))
      accepted(machine.send(.finishConfiguration(preset: preset)))
      accepted(machine.send(.beginPreparation(recordingSetId: id)))
      accepted(machine.send(.finishPreparation))
      accepted(machine.send(.beginRecording))
      accepted(machine.send(.confirmRecordingStarted(startedAtMs: Double(index))))
      if index % 2 == 0 {
        accepted(machine.send(.requestStop(reason: .userRequested)))
        accepted(machine.send(.beginFinalization))
        accepted(machine.send(.complete(output: output)))
        precondition(machine.state == .completed(recordingSetId: id, durationMs: 1000))
      } else {
        accepted(machine.send(.interrupt(reason: .backgrounded, recoverable: true)))
        precondition(machine.state == .interrupted(recordingSetId: id, reason: .backgrounded, recoverable: true))
      }
      let terminal = machine.state
      guard case .rejected = machine.send(.beginRecording) else { fatalError("terminal state accepted recording") }
      precondition(machine.state == terminal)
      accepted(machine.send(.teardown))
      precondition(machine.state == .idle)
    }
    return "cycles:\(iterations),completed:\((iterations + 1) / 2),interrupted:\(iterations / 2),idle"
  }

  @inline(never)
  static func geometry(_ iterations: Int) -> String {
    var area = 0.0
    var fingerprint: UInt64 = 14695981039346656037
    for index in 0..<iterations {
      let width = index % 2 == 0 ? 1080.0 : 1920.0
      let height = index % 2 == 0 ? 1920.0 : 1080.0
      let bounds = CGRect(x: 0, y: 0, width: width, height: height)
      let panes = CaptureSplitLayout.panes(in: bounds)
      precondition(panes.top.intersection(panes.bottom).isEmpty)
      precondition(panes.top.union(panes.bottom) == bounds)
      let inset = CapturePipLayout.frame(in: bounds, corner: CapturePipCorner.allCases[index % 4])
      precondition(bounds.contains(inset) && inset.width > 0 && inset.height > 0)
      for frame in [panes.top, panes.bottom, inset] {
        for coordinate in [frame.minX, frame.minY, frame.width, frame.height] {
          fingerprint = (fingerprint ^ Double(coordinate).bitPattern) &* 1099511628211
        }
      }
      area += panes.top.width * panes.top.height + panes.bottom.width * panes.bottom.height
    }
    precondition(area == Double(iterations) * 1080 * 1920)
    return "frames:\(iterations),area:\(Int(area)),coordinates:\(String(fingerprint, radix: 16))"
  }

  static func main() throws {
    let args = CommandLine.arguments
    guard args.count == 4, let iterations = Int(args[1]), iterations > 0,
          let warmups = Int(args[2]), warmups >= 0,
          let repetitions = Int(args[3]), repetitions >= 3 else {
      fatalError("usage: benchmark-native iterations warmups repetitions")
    }
    var results: [[String: Any]] = []
    let workloads: [(String, (Int) -> String)] = [
      ("swift-state-lifecycle", lifecycle), ("swift-composition-geometry", geometry)
    ]
    for (name, run) in workloads {
      let expected = run(iterations)
      for _ in 0..<warmups { precondition(run(iterations) == expected) }
      var samples: [Double] = []
      for _ in 0..<repetitions {
        let start = DispatchTime.now().uptimeNanoseconds
        let checksum = run(iterations)
        let elapsed = Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
        precondition(checksum == expected && elapsed > 0)
        samples.append(elapsed)
      }
      results.append(["name": name, "unit": "ms/batch", "samples": samples, "checksum": expected])
    }
    let data = try JSONSerialization.data(withJSONObject: results, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
  }
}
