declare const require: (moduleName: "node:fs") => {
  readFileSync(path: string, encoding: "utf8"): string;
};

const { readFileSync } = require("node:fs");

const discoverySource = readFileSync(
  "modules/multicam-capture/ios/CaptureDeviceDiscovery.swift",
  "utf8",
);
const sessionSource = readFileSync(
  "modules/multicam-capture/ios/CaptureSessionService.swift",
  "utf8",
);

describe("simulator camera discovery", () => {
  it("uses the typed AVFoundation selectors intercepted by serve-sim", () => {
    expect(discoverySource).toContain("AVCaptureDevice.default(\n        .builtInWideAngleCamera");
    expect(discoverySource).toContain("position: .back");
    expect(discoverySource).toContain("position: .front");
    expect(discoverySource).not.toContain(
      "AVCaptureDevice.default(for: .video)",
    );
  });

  it("keeps discovered devices ahead of simulator-specific fallbacks", () => {
    const devicesGuard = discoverySource.indexOf(
      "guard isSimulator, devices.isEmpty else",
    );
    const fallbackLookup = discoverySource.indexOf(
      "AVCaptureDevice.default(\n        .builtInWideAngleCamera",
    );

    expect(devicesGuard).toBeGreaterThan(-1);
    expect(fallbackLookup).toBeGreaterThan(devicesGuard);
  });

  it("deduplicates injected devices before sorting them", () => {
    expect(discoverySource).toContain(
      "simulatorDevices.map { ($0.uniqueID, $0) }",
    );
    expect(discoverySource).toContain(
      "return sortedDevices(Array(uniqueDevices.values))",
    );
  });

  it("does not probe hardware-only format properties on synthetic cameras", () => {
    expect(discoverySource).toContain(
      "CaptureDeviceDiscovery.cameraDescriptor(\n          $0,\n          isSimulator: isSimulator",
    );
    expect(discoverySource).toContain(
      "let fieldOfView = isSimulator\n      ? 0",
    );
    expect(discoverySource).toContain(
      '"supportsTorch": isSimulator ? false : device.hasTorch',
    );
  });

  it("allows synthetic cameras to use their native resolution", () => {
    expect(discoverySource).toContain(
      "allowsResolutionFallback: Bool = false",
    );
    expect(discoverySource).toContain(
      "allowsResolutionFallback: isSimulator",
    );
    expect(discoverySource).toContain(
      "guard allowsResolutionFallback else",
    );
    expect(discoverySource).toContain("return supportedFormats.max");
    expect(sessionSource).toContain(
      "guard !allowsResolutionFallback else {\n      return",
    );
  });

  it("requires explicit input ports only for multicamera connections", () => {
    const singleBranch = sessionSource.indexOf(
      "if preset.mode == .single {\n          session.addOutput(output)",
    );
    const portLookup = sessionSource.indexOf(
      "guard let port = input.ports.first",
    );

    expect(singleBranch).toBeGreaterThan(-1);
    expect(portLookup).toBeGreaterThan(singleBranch);
  });
});
