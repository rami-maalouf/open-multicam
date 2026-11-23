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

  it("sends failures to both expo observe and a configured development recorder", async () => {
    const development = Object.getOwnPropertyDescriptor(globalThis, "__DEV__");
    process.env.EXPO_PUBLIC_TUFT_TELEMETRY_URL = "https://telemetry.example.invalid";
    process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN = "test-value";
    Object.defineProperty(globalThis, "__DEV__", { configurable: true, value: true });
    try {
      type Tuft = { error: jest.Mock; event: jest.Mock; flush: jest.Mock };
      const loaded: {
        recorder?: typeof import("@/core/telemetry/recorder");
        observe?: typeof import("../mocks/expo-observe");
        tuft?: Tuft | null;
      } = {};
      jest.isolateModules(() => {
        loaded.observe = jest.requireActual("expo-observe");
        loaded.recorder = jest.requireActual("@/core/telemetry/recorder");
        loaded.tuft = jest.requireActual<{ telemetry: Tuft | null }>("@/core/telemetry").telemetry;
      });
      const { observe, recorder, tuft } = loaded;

      await recorder?.reportRecorderFailure("start", {
        kind: "capture-error",
        code: "recording_start_failed",
        message: "Recording could not start.",
        retryable: true,
        recoveryAction: "retry",
      });
      await recorder?.reportRecorderSuccess();

      expect((observe?.Observe.reportError.mock.calls[0]?.[0] as Error).message).toBe(
        "capture.start failed: recording_start_failed",
      );
      expect(tuft?.error).toHaveBeenCalledWith(
        "capture.recording.start_failed",
        expect.any(Error),
        expect.objectContaining({ phase: "start", code: "recording_start_failed" }),
      );
      expect(tuft?.event).toHaveBeenCalledWith("capture.recording.stop_succeeded");
      expect(tuft?.flush).toHaveBeenCalledTimes(2);
    } finally {
      if (development) Object.defineProperty(globalThis, "__DEV__", development);
      delete process.env.EXPO_PUBLIC_TUFT_TELEMETRY_URL;
      delete process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN;
    }
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
