import type { CaptureError } from "@/core/capture/errors";
import { telemetry } from "@/core/telemetry";
import { recorderFailureAttributes } from "@/core/telemetry/recorder-attributes";

export { recorderFailureAttributes } from "@/core/telemetry/recorder-attributes";

export async function reportRecorderFailure(
  phase: "start" | "stop",
  error: CaptureError,
): Promise<void> {
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
