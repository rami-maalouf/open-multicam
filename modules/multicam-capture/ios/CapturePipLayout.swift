import CoreGraphics
import Foundation

enum CapturePipCorner: String, CaseIterable, Equatable {
  case topLeading = "top-leading"
  case topTrailing = "top-trailing"
  case bottomLeading = "bottom-leading"
  case bottomTrailing = "bottom-trailing"
}

/// Resolves which of the two camera slots fills the frame and which renders
/// as the inset, so the view, the recording compositor, and the manifest all
/// agree after the viewer taps to swap them.
struct CapturePipAssignment: Equatable {
  let fullScreenIndex: Int
  let insetIndex: Int
  let primaryCameraLabel: String

  static func resolve(isSwapped: Bool) -> CapturePipAssignment {
    isSwapped
      ? CapturePipAssignment(
        fullScreenIndex: 1,
        insetIndex: 0,
        primaryCameraLabel: "B"
      )
      : CapturePipAssignment(
        fullScreenIndex: 0,
        insetIndex: 1,
        primaryCameraLabel: "A"
      )
  }
}

struct CapturePipLayout {
  static func frame(
    in bounds: CGRect,
    corner: CapturePipCorner,
    margin: CGFloat? = nil
  ) -> CGRect {
    let margin = margin ?? min(bounds.width, bounds.height) * 0.04
    guard bounds.width > margin * 2, bounds.height > margin * 2 else {
      return .zero
    }

    let isPortrait = bounds.height >= bounds.width
    let aspectRatio: CGFloat = isPortrait ? 9 / 16 : 16 / 9
    var width = bounds.width * (isPortrait ? 0.36 : 0.30)
    var height = width / aspectRatio
    let maximumHeight = bounds.height * 0.48

    if height > maximumHeight {
      height = maximumHeight
      width = height * aspectRatio
    }

    width = min(width, bounds.width - margin * 2)
    height = min(height, bounds.height - margin * 2)

    let leadingX = bounds.minX + margin
    let trailingX = bounds.maxX - margin - width
    let topY = bounds.minY + margin
    let bottomY = bounds.maxY - margin - height

    switch corner {
    case .topLeading:
      return CGRect(x: leadingX, y: topY, width: width, height: height)
    case .topTrailing:
      return CGRect(x: trailingX, y: topY, width: width, height: height)
    case .bottomLeading:
      return CGRect(x: leadingX, y: bottomY, width: width, height: height)
    case .bottomTrailing:
      return CGRect(x: trailingX, y: bottomY, width: width, height: height)
    }
  }

  static func clampedCenter(
    _ center: CGPoint,
    itemSize: CGSize,
    in bounds: CGRect,
    margin: CGFloat? = nil
  ) -> CGPoint {
    let margin = margin ?? min(bounds.width, bounds.height) * 0.04
    return CGPoint(
      x: min(
        max(center.x, bounds.minX + margin + itemSize.width / 2),
        bounds.maxX - margin - itemSize.width / 2
      ),
      y: min(
        max(center.y, bounds.minY + margin + itemSize.height / 2),
        bounds.maxY - margin - itemSize.height / 2
      )
    )
  }

  static func nearestCorner(
    to center: CGPoint,
    velocity: CGPoint,
    in bounds: CGRect,
    margin: CGFloat? = nil
  ) -> CapturePipCorner {
    let projectedCenter = CGPoint(
      x: center.x + velocity.x * 0.16,
      y: center.y + velocity.y * 0.16
    )

    return CapturePipCorner.allCases.min { lhs, rhs in
      let lhsCenter = frame(in: bounds, corner: lhs, margin: margin).center
      let rhsCenter = frame(in: bounds, corner: rhs, margin: margin).center
      return squaredDistance(projectedCenter, lhsCenter) <
        squaredDistance(projectedCenter, rhsCenter)
    } ?? .topTrailing
  }

  static func normalizedFrame(
    in bounds: CGRect,
    corner: CapturePipCorner
  ) -> CGRect {
    guard bounds.width > 0, bounds.height > 0 else {
      return .zero
    }

    let inset = frame(in: bounds, corner: corner)
    return CGRect(
      x: inset.minX / bounds.width,
      y: inset.minY / bounds.height,
      width: inset.width / bounds.width,
      height: inset.height / bounds.height
    )
  }

  private static func squaredDistance(_ lhs: CGPoint, _ rhs: CGPoint) -> CGFloat {
    let x = lhs.x - rhs.x
    let y = lhs.y - rhs.y
    return x * x + y * y
  }
}

private extension CGRect {
  var center: CGPoint {
    CGPoint(x: midX, y: midY)
  }
}
