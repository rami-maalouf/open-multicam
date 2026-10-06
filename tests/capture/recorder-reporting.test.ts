import type { CaptureError } from "@/core/capture/errors";
import { reportRecorderFailure, reportRecorderSuccess } from "@/core/telemetry/recorder";
import { telemetry } from "@/core/telemetry";

jest.mock("@/core/telemetry", () => ({ telemetry: { error: jest.fn(), event: jest.fn(), flush: jest.fn(() => Promise.resolve()) } }));

const failure: CaptureError = {
  kind: "capture-error", code: "recording_stop_failed", message: "Recording could not finish.",
  retryable: true, recoveryAction: "retry", diagnostics: { framesAppended: 0, nested: { privatePath: "private.mp4" } },
};

it("reports useful development failure diagnostics and flushes without nested recording data", async () => {
  await reportRecorderFailure("stop", failure);
  expect(telemetry?.error).toHaveBeenCalledWith("capture.recording.stop_failed", new Error(failure.message), {
    phase: "stop", code: failure.code, retryable: true, recoveryAction: "retry", framesAppended: 0,
  });
  expect(telemetry?.flush).toHaveBeenCalledWith({ timeoutMs: 5000 });
});

it("reports and flushes a completed development capture", async () => {
  await reportRecorderSuccess();
  expect(telemetry?.event).toHaveBeenCalledWith("capture.recording.stop_succeeded");
  expect(telemetry?.flush).toHaveBeenCalledWith({ timeoutMs: 5000 });
});
