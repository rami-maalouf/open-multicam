import AVFoundation
import CoreImage
import QuartzCore
import UniformTypeIdentifiers

/// A camera for the iOS Simulator, which has none. It replays a video or an
/// image from the Mac, so the dual-camera modes, recording and the library
/// can be driven and screenshotted without an iPhone.
struct CaptureSimulatedCamera {
  static let maximumZoom: CGFloat = 4

  let id: String
  let label: String
  let position: AVCaptureDevice.Position
  let deviceType: String
  let fieldOfViewDegrees: Double
  /// how far the lens crops into its feed, so the back lenses frame one
  /// scene at different widths
  let lensCrop: CGFloat
  let feedURL: URL

  var positionName: String {
    position == .front ? "front" : "back"
  }

  var descriptor: [String: Any] {
    [
      "id": id,
      "label": label,
      "position": positionName,
      "deviceType": deviceType,
      "fieldOfViewDegrees": fieldOfViewDegrees,
      "zoomRange": [
        "minimum": 1,
        "maximum": Double(Self.maximumZoom)
      ],
      "supportsFocusPoint": false,
      "supportsExposurePoint": false,
      "supportsTorch": false
    ]
  }

  var recordingCamera: CaptureRecordingCamera {
    CaptureRecordingCamera(id: id, label: label, position: positionName)
  }
}

/// Reads the feeds `scripts/simulator-cameras.mjs` stores in the simulator's
/// global defaults, which survive the app being reinstalled. With no feeds
/// set, discovery falls back to whatever camera SimCam injects. Device builds
/// never report simulated cameras.
enum CaptureSimulatedCameras {
  static let backFeedKey = "OpenMulticamSimulatedBackCamera"
  static let frontFeedKey = "OpenMulticamSimulatedFrontCamera"

  static func configured(
    defaults: UserDefaults = .standard
  ) -> [CaptureSimulatedCamera]? {
#if targetEnvironment(simulator)
    guard
      let back = feedURL(defaults.string(forKey: backFeedKey)),
      let front = feedURL(defaults.string(forKey: frontFeedKey))
    else {
      return nil
    }

    // the lenses of an iPhone 17 Pro, sorted the way discovery sorts real
    // devices and numbered the way AVFoundation numbers them, so the wide
    // back camera and the front camera make the recommended pair
    return [
      CaptureSimulatedCamera(
        id: "simulated-camera:0",
        label: "Back Camera",
        position: .back,
        deviceType: "wide",
        fieldOfViewDegrees: 73,
        lensCrop: 1.2,
        feedURL: back
      ),
      CaptureSimulatedCamera(
        id: "simulated-camera:2",
        label: "Back Telephoto Camera",
        position: .back,
        deviceType: "telephoto",
        fieldOfViewDegrees: 25,
        lensCrop: 2,
        feedURL: back
      ),
      CaptureSimulatedCamera(
        id: "simulated-camera:5",
        label: "Back Ultra Wide Camera",
        position: .back,
        deviceType: "ultra-wide",
        fieldOfViewDegrees: 106,
        lensCrop: 1,
        feedURL: back
      ),
      CaptureSimulatedCamera(
        id: "simulated-camera:1",
        label: "Front Camera",
        position: .front,
        deviceType: "true-depth",
        fieldOfViewDegrees: 85,
        lensCrop: 1,
        feedURL: front
      )
    ]
#else
    return nil
#endif
  }

  /// An iPhone 17 Pro runs any two of its cameras together: the front camera
  /// with each back lens, and any two back lenses.
  static func snapshot(
    cameras: [CaptureSimulatedCamera]
  ) -> CaptureCapabilitySnapshot {
    let frameRates = CaptureDeviceDiscovery.releaseFrameRates
    let pairs = cameras.indices.flatMap { first in
      cameras.indices.filter { $0 > first }.map { [cameras[first], cameras[$0]] }
    }
    let dualConfigurations = CaptureDeviceDiscovery.sortedByAvailability(
      pairs.flatMap { pair in
        CaptureDeviceDiscovery.dualConfigurations(
          cameraIds: pair.map(\.id),
          isFrontBack: Set(pair.map(\.position)) == Set([.front, .back]),
          frameRates: frameRates
        )
      }
    )
    let singleConfigurations = cameras.map {
      CaptureDeviceDiscovery.singleConfiguration(
        cameraId: $0.id,
        position: $0.position,
        frameRates: frameRates
      )
    }

    return CaptureCapabilitySnapshot(
      devices: [],
      cameraDescriptors: cameras.map(\.descriptor),
      configurations: dualConfigurations + singleConfigurations,
      recommendedConfigurationId: dualConfigurations.first?.id,
      isMulticamSupported: true,
      isSimulator: true,
      isSimulated: true
    )
  }

  private static func feedURL(_ path: String?) -> URL? {
    guard let path, FileManager.default.fileExists(atPath: path) else {
      return nil
    }
    return URL(fileURLWithPath: path)
  }
}

/// Plays one feed on a loop and hands out its newest frame, the way a camera
/// hands out its newest exposure.
final class CaptureSimulatedFeed {
  private let still: CIImage?
  private let player: AVPlayer?
  private let output: AVPlayerItemVideoOutput?
  private var endObserver: NSObjectProtocol?
  private var latestImage: CIImage?

  init?(url: URL) {
    if UTType(filenameExtension: url.pathExtension)?.conforms(to: .image) == true {
      guard
        let image = CIImage(
          contentsOf: url,
          options: [.applyOrientationProperty: true]
        )
      else {
        return nil
      }
      still = image
      player = nil
      output = nil
      return
    }

    let item = AVPlayerItem(url: url)
    let output = AVPlayerItemVideoOutput(pixelBufferAttributes: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
    ])
    item.add(output)
    let player = AVPlayer(playerItem: item)
    player.isMuted = true
    player.actionAtItemEnd = .none

    still = nil
    self.player = player
    self.output = output
    endObserver = NotificationCenter.default.addObserver(
      forName: AVPlayerItem.didPlayToEndTimeNotification,
      object: item,
      queue: nil
    ) { [weak player] _ in
      player?.seek(to: .zero)
    }
  }

  deinit {
    endObserver.map(NotificationCenter.default.removeObserver)
  }

  func start() {
    player?.play()
  }

  func stop() {
    player?.pause()
  }

  /// The previous frame again when the player has nothing new, so a slow
  /// decode or the jump back to the start never shows as a black frame.
  func currentImage() -> CIImage? {
    if let still {
      return still
    }

    guard let output else {
      return nil
    }

    let itemTime = output.itemTime(forHostTime: CACurrentMediaTime())
    if
      output.hasNewPixelBuffer(forItemTime: itemTime),
      let buffer = output.copyPixelBuffer(
        forItemTime: itemTime,
        itemTimeForDisplay: nil
      )
    {
      latestImage = CIImage(cvPixelBuffer: buffer)
    }
    return latestImage
  }
}

/// Drives the simulated cameras of one preset on a single clock, the way
/// AVCaptureDataOutputSynchronizer pairs real frames: each tick renders one
/// frame per camera at the preset's size, shows it, and hands the set to the
/// recorder. Every call must come from the queue it was given.
final class CaptureSimulatedSource {
  private let cameras: [CaptureSimulatedCamera]
  private let feeds: [CaptureSimulatedFeed]
  private let frameRect: CGRect
  private let frameRate: Int
  private let queue: DispatchQueue
  private let pool: CVPixelBufferPool
  private let context = CIContext(options: [.cacheIntermediates: false])
  private let colorSpace = CGColorSpaceCreateDeviceRGB()
  private let onFrames: ([CVPixelBuffer], CMTime) -> Void
  private var zoomFactors: [CGFloat]
  private var displayLayers: [AVSampleBufferDisplayLayer] = []
  private var timer: DispatchSourceTimer?

  init?(
    cameras: [CaptureSimulatedCamera],
    preset: CapturePreset,
    queue: DispatchQueue,
    onFrames: @escaping ([CVPixelBuffer], CMTime) -> Void
  ) {
    let feeds = cameras.compactMap { CaptureSimulatedFeed(url: $0.feedURL) }
    var pool: CVPixelBufferPool?
    let attributes: [String: Any] = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      kCVPixelBufferWidthKey as String: preset.width,
      kCVPixelBufferHeightKey as String: preset.height,
      kCVPixelBufferIOSurfacePropertiesKey as String: [:],
      kCVPixelBufferMetalCompatibilityKey as String: true
    ]
    guard
      feeds.count == cameras.count,
      CVPixelBufferPoolCreate(nil, nil, attributes as CFDictionary, &pool) ==
        kCVReturnSuccess,
      let pool
    else {
      return nil
    }

    self.cameras = cameras
    self.feeds = feeds
    self.pool = pool
    self.queue = queue
    self.onFrames = onFrames
    frameRect = CGRect(x: 0, y: 0, width: preset.width, height: preset.height)
    frameRate = preset.frameRate
    zoomFactors = cameras.map { _ in 1 }
  }

  /// One layer per slot: slot 0 is camera A, slot 1 camera B.
  func attach(displayLayers: [AVSampleBufferDisplayLayer]) {
    self.displayLayers = displayLayers
  }

  func start() {
    guard timer == nil else {
      return
    }

    feeds.forEach { $0.start() }
    let timer = DispatchSource.makeTimerSource(queue: queue)
    timer.schedule(
      deadline: .now(),
      repeating: .nanoseconds(1_000_000_000 / frameRate),
      leeway: .milliseconds(2)
    )
    timer.setEventHandler { [weak self] in
      self?.tick()
    }
    timer.resume()
    self.timer = timer
  }

  func stop() {
    timer?.cancel()
    timer = nil
    feeds.forEach { $0.stop() }
  }

  /// Returns the zoom actually applied, after clamping to the lens range.
  func setZoomFactor(_ factor: CGFloat, forSlot slot: Int) -> CGFloat {
    let clamped = min(max(factor, 1), CaptureSimulatedCamera.maximumZoom)
    if zoomFactors.indices.contains(slot) {
      zoomFactors[slot] = clamped
    }
    return clamped
  }

  private func tick() {
    let images = feeds.compactMap { $0.currentImage() }
    guard images.count == feeds.count else {
      return
    }

    let time = CMClockGetTime(CMClockGetHostTimeClock())
    var frames: [CVPixelBuffer] = []
    for (slot, image) in images.enumerated() {
      guard
        let frame = render(
          image,
          crop: cameras[slot].lensCrop * zoomFactors[slot]
        )
      else {
        return
      }
      frames.append(frame)
    }

    for (layer, frame) in zip(displayLayers, frames) {
      show(frame, at: time, on: layer)
    }
    onFrames(frames, time)
  }

  /// Fills the frame the way a sensor would, then crops further in for the
  /// lens and the pinch zoom.
  private func render(_ image: CIImage, crop: CGFloat) -> CVPixelBuffer? {
    var buffer: CVPixelBuffer?
    guard
      CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer) == kCVReturnSuccess,
      let buffer
    else {
      return nil
    }

    let source = image.extent
    let scale = max(
      frameRect.width / source.width,
      frameRect.height / source.height
    ) * crop
    let scaled = image.transformed(
      by: CGAffineTransform(translationX: -source.minX, y: -source.minY)
        .concatenating(CGAffineTransform(scaleX: scale, y: scale))
    )
    let centered = scaled.transformed(
      by: CGAffineTransform(
        translationX: frameRect.midX - scaled.extent.midX,
        y: frameRect.midY - scaled.extent.midY
      )
    )

    context.render(
      centered.cropped(to: frameRect),
      to: buffer,
      bounds: frameRect,
      colorSpace: colorSpace
    )
    return buffer
  }

  private func show(
    _ frame: CVPixelBuffer,
    at time: CMTime,
    on layer: AVSampleBufferDisplayLayer
  ) {
    guard
      let sample = CaptureRecordingWriter.sampleBuffer(wrapping: frame, at: time)
    else {
      return
    }

    // the layer has no timebase, so each frame is shown as soon as it lands
    if
      let attachments = CMSampleBufferGetSampleAttachmentsArray(
        sample,
        createIfNecessary: true
      ),
      CFArrayGetCount(attachments) > 0
    {
      let first = unsafeBitCast(
        CFArrayGetValueAtIndex(attachments, 0),
        to: CFMutableDictionary.self
      )
      CFDictionarySetValue(
        first,
        Unmanaged.passUnretained(kCMSampleAttachmentKey_DisplayImmediately).toOpaque(),
        Unmanaged.passUnretained(kCFBooleanTrue).toOpaque()
      )
    }

    let renderer = layer.sampleBufferRenderer
    if renderer.status == .failed {
      renderer.flush()
    }
    renderer.enqueue(sample)
  }
}
