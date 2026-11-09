declare const require: (moduleName: "node:fs") => {
  readFileSync(path: string, encoding: "utf8"): string;
};

const { readFileSync } = require("node:fs");

const simulatedSource = readFileSync(
  "modules/multicam-capture/ios/CaptureSimulatedCameras.swift",
  "utf8",
);
const discoverySource = readFileSync(
  "modules/multicam-capture/ios/CaptureDeviceDiscovery.swift",
  "utf8",
);
const sessionSource = readFileSync(
  "modules/multicam-capture/ios/CaptureSessionService.swift",
  "utf8",
);
const writerSource = readFileSync(
  "modules/multicam-capture/ios/CaptureRecordingWriter.swift",
  "utf8",
);
const scriptSource = readFileSync("scripts/simulator-cameras.mjs", "utf8");

describe("simulated cameras", () => {
  it("only switches on in simulator builds", () => {
    const configured = simulatedSource.slice(
      simulatedSource.indexOf("static func configured("),
      simulatedSource.indexOf("static func snapshot("),
    );

    expect(configured).toContain("#if targetEnvironment(simulator)");
    expect(configured).toContain("#else\n    return nil\n#endif");
  });

  it("reads the same defaults keys the script writes", () => {
    for (const key of [
      "OpenMulticamSimulatedBackCamera",
      "OpenMulticamSimulatedFrontCamera",
    ]) {
      expect(simulatedSource).toContain(`"${key}"`);
      expect(scriptSource).toContain(`"${key}"`);
    }
    expect(scriptSource).toContain('"defaults", "write", "-g"');
  });

  it("takes over discovery before any AVFoundation lookup", () => {
    const simulatedLookup = discoverySource.indexOf(
      "CaptureSimulatedCameras.configured()",
    );
    const hardwareLookup = discoverySource.indexOf(
      "let discovery = discoverySession",
    );

    expect(simulatedLookup).toBeGreaterThan(-1);
    expect(hardwareLookup).toBeGreaterThan(simulatedLookup);
  });

  it("offers every pair with the same configuration rules as hardware", () => {
    expect(simulatedSource).toContain(
      "CaptureDeviceDiscovery.dualConfigurations(",
    );
    expect(simulatedSource).toContain(
      "CaptureDeviceDiscovery.singleConfiguration(",
    );
    expect(simulatedSource).toContain("isMulticamSupported: true");
    expect(simulatedSource).toContain("isSimulated: true");
  });

  it("records simulated frames through the writer's shared composite path", () => {
    expect(sessionSource).toContain(
      "self?.recordingWriter?.appendFrames(frames, at: time)",
    );

    const appendFrames = writerSource.slice(
      writerSource.indexOf("func appendFrames("),
      writerSource.indexOf("static func sampleBuffer("),
    );
    expect(appendFrames).toContain("composeLatestPair(at: time)");

    const appendComposite = writerSource.slice(
      writerSource.indexOf("private func appendComposite("),
      writerSource.indexOf("private func composeLatestPair("),
    );
    expect(appendComposite).toContain(
      "composeLatestPair(at: CMSampleBufferGetPresentationTimeStamp(primarySample))",
    );
  });
});
