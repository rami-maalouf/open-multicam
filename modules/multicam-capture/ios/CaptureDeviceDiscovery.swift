import AVFoundation
import CoreMedia
import Foundation

struct CaptureConfigurationDescriptor {
  let id: String
  let mode: CaptureMode
  let output: CaptureOutput
  let cameraIds: [String]
  let frameRates: [Int]
  let availability: String
  let bitrate: Int
  let estimatedHardwareCost: Double

  var payload: [String: Any] {
    [
      "kind": "supported",
      "id": id,
      "mode": mode.rawValue,
      "output": output.rawValue,
      "cameraIds": cameraIds,
      "frameRates": frameRates,
      "availability": availability,
      "profile": "core1080p",
      "codec": "h264",
      "bitrate": bitrate,
      "stabilization": "standard",
      "estimatedHardwareCost": estimatedHardwareCost
    ]
  }
}

struct CaptureCapabilitySnapshot {
  let devices: [AVCaptureDevice]
  let configurations: [CaptureConfigurationDescriptor]
  let recommendedConfigurationId: String?
  let isMulticamSupported: Bool
  let isSimulator: Bool

  var payload: [String: Any] {
    CaptureBoundaryPayloads.deviceCapabilities(
      discoveredAtMs: Date().timeIntervalSince1970 * 1_000,
      cameras: devices.map(CaptureDeviceDiscovery.cameraDescriptor),
      configurations: configurations.map(\.payload),
      recommendedConfigurationId: recommendedConfigurationId,
      isMulticamSupported: isMulticamSupported,
      isSimulator: isSimulator
    )
  }

  func device(id: String) -> AVCaptureDevice? {
    devices.first { $0.uniqueID == id }
  }

  func resolve(request: [String: Any]) -> Result<CapturePreset, CaptureFailure> {
    guard
      let configurationId = request["configurationId"] as? String,
      let configuration = configurations.first(where: { $0.id == configurationId }),
      let modeValue = request["mode"] as? String,
      let mode = CaptureMode(rawValue: modeValue),
      let outputValue = request["output"] as? String,
      let output = CaptureOutput(rawValue: outputValue),
      let cameraAId = request["cameraAId"] as? String,
      let orientationValue = request["orientation"] as? String,
      let orientation = CaptureOrientation(rawValue: orientationValue),
      let frameRate = Self.integerValue(request["frameRate"])
    else {
      return .failure(.invalidRequest)
    }

    let cameraBId = request["cameraBId"] as? String
    let requestedIds = [cameraAId, cameraBId].compactMap { $0 }

    guard
      configuration.mode == mode,
      configuration.output == output,
      Set(configuration.cameraIds) == Set(requestedIds),
      configuration.frameRates.contains(frameRate)
    else {
      return .failure(.configurationUnavailable)
    }

    return .success(
      CapturePreset(
        configurationId: configurationId,
        mode: mode,
        output: output,
        cameraAId: cameraAId,
        cameraBId: cameraBId,
        orientation: orientation,
        width: orientation == .portrait ? 1_080 : 1_920,
        height: orientation == .portrait ? 1_920 : 1_080,
        frameRate: frameRate,
        bitrate: configuration.bitrate,
        stabilization: "standard"
      )
    )
  }

  private static func integerValue(_ value: Any?) -> Int? {
    switch value {
    case let integer as Int:
      integer
    case let double as Double where double.rounded() == double:
      Int(double)
    case let number as NSNumber where number.doubleValue.rounded() == number.doubleValue:
      number.intValue
    default:
      nil
    }
  }
}

enum CaptureDeviceDiscovery {
  private static let releaseFrameRates = [24, 25, 30]

  static func capabilities(isSimulator: Bool) -> [String: Any] {
    snapshot(isSimulator: isSimulator).payload
  }

  static func snapshot(isSimulator: Bool) -> CaptureCapabilitySnapshot {
    let discovery = discoverySession
    let devices = sortedDevices(discovery.devices)
    let singleConfigurations = devices.compactMap {
      singleConfiguration(for: $0, isSimulator: isSimulator)
    }
    let multicamSupported =
      !isSimulator && AVCaptureMultiCamSession.isMultiCamSupported
    let availableDualConfigurations = multicamSupported
      ? dualConfigurations(discovery: discovery)
      : []
    let configurations = availableDualConfigurations + singleConfigurations
    let recommended =
      availableDualConfigurations.first?.id ?? singleConfigurations.first?.id

    return CaptureCapabilitySnapshot(
      devices: devices,
      configurations: configurations,
      recommendedConfigurationId: recommended,
      isMulticamSupported:
        multicamSupported && !availableDualConfigurations.isEmpty,
      isSimulator: isSimulator
    )
  }

  static func preferredVideoDevice() -> AVCaptureDevice? {
    let devices = sortedDevices(discoverySession.devices)
    return devices.first(where: { $0.position == .back }) ?? devices.first
  }

  static func format(
    for device: AVCaptureDevice,
    frameRate: Int,
    requiresMulticam: Bool
  ) -> AVCaptureDevice.Format? {
    device.formats
      .filter { format in
        let dimensions = CMVideoFormatDescriptionGetDimensions(
          format.formatDescription
        )
        let is1080p =
          (dimensions.width == 1_920 && dimensions.height == 1_080) ||
          (dimensions.width == 1_080 && dimensions.height == 1_920)
        let supportsRate = format.videoSupportedFrameRateRanges.contains {
          $0.minFrameRate <= Double(frameRate) &&
            $0.maxFrameRate >= Double(frameRate)
        }

        return is1080p &&
          supportsRate &&
          (!requiresMulticam || format.isMultiCamSupported)
      }
      .sorted { lhs, rhs in
        let left = CMVideoFormatDescriptionGetDimensions(lhs.formatDescription)
        let right = CMVideoFormatDescriptionGetDimensions(rhs.formatDescription)
        return left.width * left.height < right.width * right.height
      }
      .first
  }

  static func cameraDescriptor(_ device: AVCaptureDevice) -> [String: Any] {
    let minimumZoom = finiteValue(
      device.minAvailableVideoZoomFactor,
      fallback: 1
    )
    let maximumZoom = finiteValue(
      device.maxAvailableVideoZoomFactor,
      fallback: minimumZoom
    )
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

  private static var discoverySession: AVCaptureDevice.DiscoverySession {
    AVCaptureDevice.DiscoverySession(
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
  }

  private static func singleConfiguration(
    for device: AVCaptureDevice,
    isSimulator: Bool
  ) -> CaptureConfigurationDescriptor? {
    var frameRates = releaseFrameRates.filter {
      format(for: device, frameRate: $0, requiresMulticam: false) != nil
    }

    if isSimulator && frameRates.isEmpty {
      frameRates = [30]
    }

    guard !frameRates.isEmpty else {
      return nil
    }

    return CaptureConfigurationDescriptor(
      id: "single:\(device.uniqueID)",
      mode: .single,
      output: .singleFile,
      cameraIds: [device.uniqueID],
      frameRates: frameRates,
      availability: device.position == .back ? "recommended" : "available",
      bitrate: 16_000_000,
      estimatedHardwareCost: 0.45
    )
  }

  private static func dualConfigurations(
    discovery: AVCaptureDevice.DiscoverySession
  ) -> [CaptureConfigurationDescriptor] {
    discovery.supportedMultiCamDeviceSets.compactMap { deviceSet in
      let devices = sortedDevices(Array(deviceSet))

      guard devices.count == 2 else {
        return nil
      }

      let frameRates = releaseFrameRates.filter { frameRate in
        devices.allSatisfy {
          format(for: $0, frameRate: frameRate, requiresMulticam: true) != nil
        }
      }

      guard !frameRates.isEmpty else {
        return nil
      }

      let ids = devices.map(\.uniqueID)
      let isFrontBack = Set(devices.map(\.position)) == Set([.front, .back])

      return CaptureConfigurationDescriptor(
        id: "discrete:\(ids.joined(separator: ":"))",
        mode: .discrete,
        output: .dualFiles,
        cameraIds: ids,
        frameRates: frameRates,
        availability: isFrontBack ? "recommended" : "available",
        bitrate: 12_000_000,
        estimatedHardwareCost: 0.80
      )
    }
    .sorted { lhs, rhs in
      if lhs.availability != rhs.availability {
        return lhs.availability == "recommended"
      }
      return lhs.id < rhs.id
    }
  }

  private static func sortedDevices(
    _ devices: [AVCaptureDevice]
  ) -> [AVCaptureDevice] {
    devices.sorted { lhs, rhs in
      if lhs.position != rhs.position {
        return positionRank(lhs.position) < positionRank(rhs.position)
      }

      return lhs.localizedName.localizedStandardCompare(rhs.localizedName) ==
        .orderedAscending
    }
  }

  private static func finiteValue(
    _ value: CGFloat,
    fallback: CGFloat
  ) -> Double {
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

  private static func deviceTypeName(
    _ deviceType: AVCaptureDevice.DeviceType
  ) -> String {
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
