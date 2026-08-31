import XCTest
@testable import MulticamCaptureBoundary

final class CaptureModuleTests: XCTestCase {
  func testSimulatorCapabilitiesAreExplicitlyUnsupported() throws {
    let payload = CaptureBoundaryPayloads.deviceCapabilities(
      discoveredAtMs: 1_234,
      isSimulator: true
    )
    let multicam = try XCTUnwrap(payload["multicam"] as? [String: Any])
    let reason = try XCTUnwrap(multicam["reason"] as? [String: Any])

    XCTAssertEqual(payload["kind"] as? String, "device-capabilities")
    XCTAssertEqual(payload["schemaVersion"] as? Int, 1)
    XCTAssertEqual(payload["discoveredAtMs"] as? Double, 1_234)
    XCTAssertEqual(multicam["kind"] as? String, "unsupported")
    XCTAssertEqual(reason["kind"] as? String, "multicam-unsupported")
    XCTAssertEqual(reason["message"] as? String, CaptureBoundaryPayloads.simulatorMessage)
    XCTAssertEqual((payload["cameras"] as? [[String: Any]])?.count, 0)
    XCTAssertEqual((payload["configurations"] as? [[String: Any]])?.count, 0)
  }

  func testSimulatorCommandsReturnOneSanitizedFailure() throws {
    let result = CaptureBoundaryPayloads.unavailableResult(isSimulator: true)
    let error = try XCTUnwrap(result["error"] as? [String: Any])

    XCTAssertEqual(result["ok"] as? Bool, false)
    XCTAssertEqual(error["kind"] as? String, "capture-error")
    XCTAssertEqual(error["code"] as? String, "multicam_unsupported")
    XCTAssertEqual(error["message"] as? String, CaptureBoundaryPayloads.simulatorMessage)
    XCTAssertEqual(error["retryable"] as? Bool, false)
    XCTAssertEqual(error["recoveryAction"] as? String, "select-configuration")
    XCTAssertNil(error["nativeError"])
    XCTAssertNil(error["filePath"])
  }

  func testPhysicalDevicePlaceholderIsRetryable() throws {
    let result = CaptureBoundaryPayloads.unavailableResult(isSimulator: false)
    let error = try XCTUnwrap(result["error"] as? [String: Any])

    XCTAssertEqual(error["code"] as? String, "configuration_unavailable")
    XCTAssertEqual(error["retryable"] as? Bool, true)
    XCTAssertEqual(error["recoveryAction"] as? String, "retry")
  }

  func testStateEventsAreMonotonicAndDeduplicated() throws {
    let events = CaptureBoundaryEventSequence()
    let idle = try XCTUnwrap(events.stateChanged(to: ["kind": "idle"]))
    let previewing = try XCTUnwrap(events.stateChanged(to: ["kind": "previewing"]))

    XCTAssertEqual(idle["sequence"] as? Int, 1)
    XCTAssertNil(events.stateChanged(to: ["kind": "previewing"]))
    XCTAssertEqual(previewing["sequence"] as? Int, 2)
    XCTAssertNil(events.stateChanged(to: [:]))
  }
}
