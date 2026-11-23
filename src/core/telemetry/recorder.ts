import type { CaptureError } from "@/core/capture/errors";
import { telemetry } from "@/core/telemetry";
import { reportCaptureFailure } from "@/core/telemetry/observe";
import { recorderFailureAttributes } from "@/core/telemetry/recorder-attributes";

export { recorderFailureAttributes } from "@/core/telemetry/recorder-attributes";

// every build reports the failure to expo observe. the development-only tuft recorder also
// gets it, with its diagnostics, when a development build configured one.
export async function reportRecorderFailure(
  phase: "start" | "stop",
  error: CaptureError,
): Promise<void> {
  reportCaptureFailure(phase, error);

  if (telemetry === null) {
    return;
  }

  telemetry.error(
    `capture.recording.${phase}_failed`,
    new Error(error.message),
    recorderFailureAttributes(phase, error),
  );
  await telemetry.flush({ timeoutMs: 5_000 });
}

export async function reportRecorderSuccess(): Promise<void> {
  if (telemetry === null) {
    return;
  }

  telemetry.event("capture.recording.stop_succeeded");
  await telemetry.flush({ timeoutMs: 5_000 });
}
