import XCTest
@testable import MulticamCaptureBoundary

final class CaptureModuleTests: XCTestCase {
  func testSimulatorWithoutSimCamExplainsHowToRecover() throws {
    let payload = CaptureBoundaryPayloads.deviceCapabilities(
      discoveredAtMs: 1_234,
      cameras: [],
      isMulticamSupported: false,
      isSimulator: true
    )
    let multicam = try XCTUnwrap(payload["multicam"] as? [String: Any])
    let reason = try XCTUnwrap(multicam["reason"] as? [String: Any])

    XCTAssertEqual(payload["kind"] as? String, "device-capabilities")
    XCTAssertEqual(payload["schemaVersion"] as? Int, 1)
    XCTAssertEqual(payload["discoveredAtMs"] as? Double, 1_234)
    XCTAssertEqual(payload["isSimulator"] as? Bool, true)
    XCTAssertEqual(multicam["kind"] as? String, "unsupported")
    XCTAssertEqual(reason["kind"] as? String, "camera-unavailable")
    XCTAssertEqual(
      reason["message"] as? String,
      CaptureBoundaryPayloads.simulatorCameraUnavailableMessage
    )
    XCTAssertEqual((payload["cameras"] as? [[String: Any]])?.count, 0)
    XCTAssertEqual((payload["configurations"] as? [[String: Any]])?.count, 0)
  }

  func testSimulatorCameraIsDiscoverableWithoutClaimingMulticamSupport() throws {
    let camera: [String: Any] = ["id": "simcam-back", "label": "SimCam Back"]
    let payload = CaptureBoundaryPayloads.deviceCapabilities(
      discoveredAtMs: 1_234,
      cameras: [camera],
      isMulticamSupported: false,
      isSimulator: true
    )
    let cameras = try XCTUnwrap(payload["cameras"] as? [[String: Any]])
    let multicam = try XCTUnwrap(payload["multicam"] as? [String: Any])
    let reason = try XCTUnwrap(multicam["reason"] as? [String: Any])

    XCTAssertEqual(cameras.first?["id"] as? String, "simcam-back")
    XCTAssertEqual(multicam["kind"] as? String, "unsupported")
    XCTAssertEqual(reason["kind"] as? String, "multicam-unsupported")
    XCTAssertEqual(
      reason["message"] as? String,
      CaptureBoundaryPayloads.simulatorSingleCameraMessage
    )
  }

  func testSupportedMulticamPayloadHasNoUnsupportedReason() throws {
    let payload = CaptureBoundaryPayloads.deviceCapabilities(
      discoveredAtMs: 1_234,
      cameras: [["id": "back"], ["id": "front"]],
      isMulticamSupported: true,
      isSimulator: false
    )
    let multicam = try XCTUnwrap(payload["multicam"] as? [String: Any])

    XCTAssertEqual(multicam["kind"] as? String, "supported")
    XCTAssertEqual(payload["isSimulator"] as? Bool, false)
    XCTAssertNil(multicam["reason"])
  }

  func testUnavailableCommandsReturnOneSanitizedFailure() throws {
    let result = CaptureBoundaryPayloads.unavailableResult()
    let error = try XCTUnwrap(result["error"] as? [String: Any])

    XCTAssertEqual(result["ok"] as? Bool, false)
    XCTAssertEqual(error["kind"] as? String, "capture-error")
    XCTAssertEqual(error["code"] as? String, "configuration_unavailable")
    XCTAssertEqual(error["message"] as? String, CaptureBoundaryPayloads.unavailableMessage)
    XCTAssertEqual(error["retryable"] as? Bool, true)
    XCTAssertEqual(error["recoveryAction"] as? String, "retry")
    XCTAssertNil(error["nativeError"])
    XCTAssertNil(error["filePath"])
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

  func testLifecycleInvalidationPreservesEventSequence() throws {
    let events = CaptureBoundaryEventSequence()
    let firstMount = try XCTUnwrap(events.stateChanged(to: ["kind": "idle"]))

    events.invalidateCurrentState()

    let foreground = try XCTUnwrap(events.stateChanged(to: ["kind": "idle"]))
    XCTAssertEqual(firstMount["sequence"] as? Int, 1)
    XCTAssertEqual(foreground["sequence"] as? Int, 2)
  }
}
