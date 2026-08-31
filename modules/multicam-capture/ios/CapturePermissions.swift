import AVFoundation
import Foundation
import UIKit

enum CapturePermissions {
  static func statusPayload() -> [String: Any] {
    [
      "kind": "capture-permissions",
      "camera": statusName(AVCaptureDevice.authorizationStatus(for: .video)),
      "microphone": statusName(AVCaptureDevice.authorizationStatus(for: .audio))
    ]
  }

  static func requestCamera() async -> [String: Any] {
    await AVCaptureDevice.requestAccess(for: .video)
    return statusPayload()
  }

  static func requestMicrophone() async -> [String: Any] {
    await AVCaptureDevice.requestAccess(for: .audio)
    return statusPayload()
  }

  @MainActor
  static func openSettings() -> Bool {
    guard let url = URL(string: UIApplication.openSettingsURLString) else {
      return false
    }

    UIApplication.shared.open(url)
    return true
  }

  private static func statusName(_ status: AVAuthorizationStatus) -> String {
    switch status {
    case .notDetermined:
      "not-determined"
    case .authorized:
      "authorized"
    case .denied:
      "denied"
    case .restricted:
      "restricted"
    @unknown default:
      "restricted"
    }
  }
}
