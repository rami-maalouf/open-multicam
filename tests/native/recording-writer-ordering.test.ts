declare const require: (moduleName: "node:fs") => {
  readFileSync(path: string, encoding: "utf8"): string;
};

const { readFileSync } = require("node:fs");

const writerSource = readFileSync(
  "modules/multicam-capture/ios/CaptureRecordingWriter.swift",
  "utf8",
);

describe("PiP recording writer lifecycle", () => {
  it("starts the asset-writer session before checking input readiness and its pixel pool", () => {
    const appendCompositeStart = writerSource.indexOf(
      "private func appendComposite(",
    );
    const appendCompositeEnd = writerSource.indexOf(
      "private func appendSynchronizedAudio(",
      appendCompositeStart,
    );
    const appendComposite = writerSource.slice(appendCompositeStart, appendCompositeEnd);

    const beginIndex = appendComposite.indexOf("beginIfNeeded(at: time)");
    const readinessIndex = appendComposite.indexOf(
      "writer.videoInput.isReadyForMoreMediaData",
    );
    const poolIndex = appendComposite.indexOf(
      "let pool = writer.compositePixelBufferPool",
    );

    expect(beginIndex).toBeGreaterThan(-1);
    expect(readinessIndex).toBeGreaterThan(beginIndex);
    expect(poolIndex).toBeGreaterThan(beginIndex);
  });

  it("allocates composite frames from an owned pool instead of the adaptor's optional pool", () => {
    expect(writerSource).toContain("let compositePixelBufferPool: CVPixelBufferPool?");

    const appendCompositeStart = writerSource.indexOf("private func appendComposite(");
    const appendCompositeEnd = writerSource.indexOf(
      "private func appendSynchronizedAudio(",
      appendCompositeStart,
    );
    const appendComposite = writerSource.slice(appendCompositeStart, appendCompositeEnd);

    expect(appendComposite).toContain("let pool = writer.compositePixelBufferPool");
    expect(appendComposite).not.toContain("adaptor.pixelBufferPool");
  });

  it("caches each PiP camera independently and composites on the primary camera clock", () => {
    const appendCompositeStart = writerSource.indexOf("private func appendComposite(");
    const appendCompositeEnd = writerSource.indexOf(
      "private func appendSynchronizedAudio(",
      appendCompositeStart,
    );
    const appendComposite = writerSource.slice(appendCompositeStart, appendCompositeEnd);

    expect(writerSource).toContain("private var latestPipPrimaryBuffer: CVPixelBuffer?");
    expect(writerSource).toContain("private var latestPipSecondaryBuffer: CVPixelBuffer?");
    expect(appendComposite).toContain("latestPipSecondaryBuffer = secondaryBuffer");
    expect(appendComposite).toContain("latestPipPrimaryBuffer = primaryBuffer");
    expect(appendComposite).toContain("guard let primarySample else");
    expect(appendComposite).toContain("let secondaryBuffer = latestPipSecondaryBuffer");
  });

  it("returns content-free PiP writer diagnostics when no frame is accepted", () => {
    expect(writerSource).toContain("private struct PipDiagnostics");
    expect(writerSource).toContain("synchronizedCollections");
    expect(writerSource).toContain("validFramePairs");
    expect(writerSource).toContain("inputNotReadyCount");
    expect(writerSource).toContain("bufferAllocationFailureCount");
    expect(writerSource).toContain("appendRejectionCount");
    expect(writerSource).toContain("framesAppended");
    expect(writerSource).toContain("writerStatus");
    expect(writerSource).toContain("writerErrorDomain");
    expect(writerSource).toContain("writerErrorCode");
    expect(writerSource).toContain("recordingTooShort.withDiagnostics");
  });
});
