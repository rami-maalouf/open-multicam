import CoreGraphics
import XCTest
@testable import MulticamCaptureBoundary

final class CapturePipLayoutTests: XCTestCase {
  private let portraitBounds = CGRect(x: 0, y: 0, width: 390, height: 844)

  func testPlacesInsetInEveryRequestedCorner() {
    let topLeading = CapturePipLayout.frame(
      in: portraitBounds,
      corner: .topLeading
    )
    let topTrailing = CapturePipLayout.frame(
      in: portraitBounds,
      corner: .topTrailing
    )
    let bottomLeading = CapturePipLayout.frame(
      in: portraitBounds,
      corner: .bottomLeading
    )
    let bottomTrailing = CapturePipLayout.frame(
      in: portraitBounds,
      corner: .bottomTrailing
    )

    XCTAssertEqual(topLeading.minX, 15.6, accuracy: 0.001)
    XCTAssertEqual(topLeading.minY, 15.6, accuracy: 0.001)
    XCTAssertEqual(topTrailing.maxX, 374.4, accuracy: 0.001)
    XCTAssertEqual(topTrailing.minY, 15.6, accuracy: 0.001)
    XCTAssertEqual(bottomLeading.minX, 15.6, accuracy: 0.001)
    XCTAssertEqual(bottomLeading.maxY, 828.4, accuracy: 0.001)
    XCTAssertEqual(bottomTrailing.maxX, 374.4, accuracy: 0.001)
    XCTAssertEqual(bottomTrailing.maxY, 828.4, accuracy: 0.001)
  }

  func testAssignsCameraAToTheFullScreenUntilTheViewerSwaps() {
    let unswapped = CapturePipAssignment.resolve(isSwapped: false)

    XCTAssertEqual(unswapped.fullScreenIndex, 0)
    XCTAssertEqual(unswapped.insetIndex, 1)
    XCTAssertEqual(unswapped.primaryCameraLabel, "A")
  }

  func testPromotesCameraBToTheFullScreenWhenSwapped() {
    let swapped = CapturePipAssignment.resolve(isSwapped: true)

    XCTAssertEqual(swapped.fullScreenIndex, 1)
    XCTAssertEqual(swapped.insetIndex, 0)
    XCTAssertEqual(swapped.primaryCameraLabel, "B")
  }

  func testKeepsBothCameraSlotsCoveredInEitherSwapState() {
    for isSwapped in [false, true] {
      let assignment = CapturePipAssignment.resolve(isSwapped: isSwapped)

      XCTAssertNotEqual(
        assignment.fullScreenIndex,
        assignment.insetIndex,
        "a camera must not fill both roles"
      )
      XCTAssertEqual(
        Set([assignment.fullScreenIndex, assignment.insetIndex]),
        Set([0, 1])
      )
    }
  }

  func testClampsDraggedInsetInsideSafeMargins() {
    let size = CGSize(width: 140, height: 248)
    let upperLeft = CapturePipLayout.clampedCenter(
      CGPoint(x: -200, y: -200),
      itemSize: size,
      in: portraitBounds
    )
    let lowerRight = CapturePipLayout.clampedCenter(
      CGPoint(x: 900, y: 900),
      itemSize: size,
      in: portraitBounds
    )

    XCTAssertEqual(upperLeft.x, 85.6, accuracy: 0.001)
    XCTAssertEqual(upperLeft.y, 139.6, accuracy: 0.001)
    XCTAssertEqual(lowerRight.x, 304.4, accuracy: 0.001)
    XCTAssertEqual(lowerRight.y, 704.4, accuracy: 0.001)
  }

  func testProjectedVelocityChoosesTheIntentionalCorner() {
    let stationary = CapturePipLayout.nearestCorner(
      to: CGPoint(x: 100, y: 200),
      velocity: .zero,
      in: portraitBounds
    )
    let flicked = CapturePipLayout.nearestCorner(
      to: CGPoint(x: 100, y: 200),
      velocity: CGPoint(x: 2_000, y: 3_000),
      in: portraitBounds
    )

    XCTAssertEqual(stationary, .topLeading)
    XCTAssertEqual(flicked, .bottomTrailing)
  }

  func testNormalizedFrameStaysWithinTheRecordedCanvas() {
    for corner in CapturePipCorner.allCases {
      let frame = CapturePipLayout.normalizedFrame(
        in: CGRect(x: 0, y: 0, width: 1_080, height: 1_920),
        corner: corner
      )

      XCTAssertGreaterThan(frame.width, 0)
      XCTAssertGreaterThan(frame.height, 0)
      XCTAssertGreaterThanOrEqual(frame.minX, 0)
      XCTAssertGreaterThanOrEqual(frame.minY, 0)
      XCTAssertLessThanOrEqual(frame.maxX, 1)
      XCTAssertLessThanOrEqual(frame.maxY, 1)
    }
  }

  func testNormalizedGeometryMatchesAcrossEquivalentCanvases() {
    let preview = CapturePipLayout.normalizedFrame(
      in: CGRect(x: 0, y: 0, width: 360, height: 640),
      corner: .bottomTrailing
    )
    let recording = CapturePipLayout.normalizedFrame(
      in: CGRect(x: 0, y: 0, width: 1_080, height: 1_920),
      corner: .bottomTrailing
    )

    XCTAssertEqual(preview.minX, recording.minX, accuracy: 0.001)
    XCTAssertEqual(preview.minY, recording.minY, accuracy: 0.001)
    XCTAssertEqual(preview.width, recording.width, accuracy: 0.001)
    XCTAssertEqual(preview.height, recording.height, accuracy: 0.001)
  }
}
