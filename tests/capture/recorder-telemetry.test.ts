import { recorderFailureAttributes } from "@/core/telemetry/recorder-attributes";

declare const require: (moduleName: "node:fs") => {
  readFileSync(path: string, encoding: "utf8"): string;
};

const { readFileSync } = require("node:fs");

describe("recorder telemetry", () => {
  it("keeps only primitive, content-free native diagnostics", () => {
    expect(
      recorderFailureAttributes("stop", {
        kind: "capture-error",
        code: "recording_stop_failed",
        message: "No complete video frame was recorded.",
        retryable: true,
        recoveryAction: "retry",
        diagnostics: {
          framesAppended: 0,
          writerStatus: "writing",
          writerErrorCode: null,
          nested: { filename: "private.mp4" },
        },
      }),
    ).toEqual({
      phase: "stop",
      code: "recording_stop_failed",
      retryable: true,
      recoveryAction: "retry",
      framesAppended: 0,
      writerStatus: "writing",
      writerErrorCode: null,
    });
  });

  it("reports the matching start and stop native failure branches", () => {
    const screenSource = readFileSync(
      "src/screens/capture/capture-screen.tsx",
      "utf8",
    );
    const toggleStart = screenSource.indexOf(
      "const toggleRecording = useCallback",
    );
    const startBranch = screenSource.slice(
      toggleStart,
      screenSource.indexOf('if (phase === "recording")', toggleStart),
    );
    const stopBranch = screenSource.slice(
      screenSource.indexOf('if (phase === "recording")', toggleStart),
      screenSource.indexOf("const canRecord", toggleStart),
    );

    expect(startBranch).toContain('reportRecorderFailure("start", result.error)');
    expect(stopBranch).toContain('reportRecorderFailure("stop", result.error)');
    expect(stopBranch).toContain("reportRecorderSuccess()");
  });
});
