import AVFoundation
import Foundation

enum CaptureDeviceDiscovery {
  static func capabilities(isSimulator: Bool) -> [String: Any] {
    CaptureBoundaryPayloads.deviceCapabilities(
      discoveredAtMs: Date().timeIntervalSince1970 * 1_000,
      cameras: videoDevices.map(cameraDescriptor),
      isMulticamSupported:
        !isSimulator && AVCaptureMultiCamSession.isMultiCamSupported,
      isSimulator: isSimulator
    )
  }

  static func preferredVideoDevice() -> AVCaptureDevice? {
    videoDevices.first(where: { $0.position == .back }) ?? videoDevices.first
  }

  private static var videoDevices: [AVCaptureDevice] {
    let discovery = AVCaptureDevice.DiscoverySession(
      deviceTypes: [
        .builtInWideAngleCamera,
        .builtInUltraWideCamera,
        .builtInTelephotoCamera,
        .builtInTrueDepthCamera,
        .external
      ],
      mediaType: .video,
      position: .unspecified
    )

    return discovery.devices.sorted { lhs, rhs in
      if lhs.position != rhs.position {
        return positionRank(lhs.position) < positionRank(rhs.position)
      }

      return lhs.localizedName.localizedStandardCompare(rhs.localizedName) == .orderedAscending
    }
  }

  private static func cameraDescriptor(_ device: AVCaptureDevice) -> [String: Any] {
    let minimumZoom = finiteValue(device.minAvailableVideoZoomFactor, fallback: 1)
    let maximumZoom = finiteValue(device.maxAvailableVideoZoomFactor, fallback: minimumZoom)
    let fieldOfView = finiteValue(
      CGFloat(device.activeFormat.videoFieldOfView),
      fallback: 0
    )

    return [
      "id": device.uniqueID,
      "label": device.localizedName,
      "position": positionName(device.position),
      "deviceType": deviceTypeName(device.deviceType),
      "fieldOfViewDegrees": fieldOfView,
      "zoomRange": [
        "minimum": minimumZoom,
        "maximum": max(minimumZoom, maximumZoom)
      ],
      "supportsFocusPoint": device.isFocusPointOfInterestSupported,
      "supportsExposurePoint": device.isExposurePointOfInterestSupported,
      "supportsTorch": device.hasTorch
    ]
  }

  private static func finiteValue(_ value: CGFloat, fallback: CGFloat) -> Double {
    Double(value.isFinite ? value : fallback)
  }

  private static func positionRank(_ position: AVCaptureDevice.Position) -> Int {
    switch position {
    case .back:
      0
    case .front:
      1
    case .unspecified:
      2
    @unknown default:
      3
    }
  }

  private static func positionName(_ position: AVCaptureDevice.Position) -> String {
    switch position {
    case .front:
      "front"
    case .back:
      "back"
    case .unspecified:
      "unspecified"
    @unknown default:
      "unspecified"
    }
  }

  private static func deviceTypeName(_ deviceType: AVCaptureDevice.DeviceType) -> String {
    switch deviceType {
    case .builtInWideAngleCamera:
      "wide"
    case .builtInUltraWideCamera:
      "ultra-wide"
    case .builtInTelephotoCamera:
      "telephoto"
    case .builtInTrueDepthCamera:
      "true-depth"
    case .external:
      "external"
    default:
      "other"
    }
  }
}
