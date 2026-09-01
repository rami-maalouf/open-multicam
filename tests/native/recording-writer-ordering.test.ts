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
    const appendPipStart = writerSource.indexOf(
      "private func appendPip(",
    );
    const appendPipEnd = writerSource.indexOf(
      "private func appendSynchronizedAudio(",
      appendPipStart,
    );
    const appendPip = writerSource.slice(appendPipStart, appendPipEnd);

    const beginIndex = appendPip.indexOf("beginIfNeeded(at: time)");
    const readinessIndex = appendPip.indexOf(
      "writer.videoInput.isReadyForMoreMediaData",
    );
    const poolIndex = appendPip.indexOf(
      "let pool = writer.compositePixelBufferPool",
    );

    expect(beginIndex).toBeGreaterThan(-1);
    expect(readinessIndex).toBeGreaterThan(beginIndex);
    expect(poolIndex).toBeGreaterThan(beginIndex);
  });

  it("allocates composite frames from an owned pool instead of the adaptor's optional pool", () => {
    expect(writerSource).toContain("let compositePixelBufferPool: CVPixelBufferPool?");

    const appendPipStart = writerSource.indexOf("private func appendPip(");
    const appendPipEnd = writerSource.indexOf(
      "private func appendSynchronizedAudio(",
      appendPipStart,
    );
    const appendPip = writerSource.slice(appendPipStart, appendPipEnd);

    expect(appendPip).toContain("let pool = writer.compositePixelBufferPool");
    expect(appendPip).not.toContain("adaptor.pixelBufferPool");
  });

  it("caches each PiP camera independently and composites on the primary camera clock", () => {
    const appendPipStart = writerSource.indexOf("private func appendPip(");
    const appendPipEnd = writerSource.indexOf(
      "private func appendSynchronizedAudio(",
      appendPipStart,
    );
    const appendPip = writerSource.slice(appendPipStart, appendPipEnd);

    expect(writerSource).toContain("private var latestPipPrimaryBuffer: CVPixelBuffer?");
    expect(writerSource).toContain("private var latestPipSecondaryBuffer: CVPixelBuffer?");
    expect(appendPip).toContain("latestPipSecondaryBuffer = secondaryBuffer");
    expect(appendPip).toContain("latestPipPrimaryBuffer = primaryBuffer");
    expect(appendPip).toContain("guard let primarySample else");
    expect(appendPip).toContain("let secondaryBuffer = latestPipSecondaryBuffer");
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
