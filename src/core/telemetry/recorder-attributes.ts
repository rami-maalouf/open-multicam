import type { TelemetryAttributes, TelemetryValue } from "tuft-telemetry";

import type { CaptureError } from "@/core/capture/errors";

function isTelemetryValue(value: unknown): value is TelemetryValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

export function recorderFailureAttributes(
  phase: "start" | "stop",
  error: CaptureError,
): TelemetryAttributes {
  const attributes: TelemetryAttributes = {
    phase,
    code: error.code,
    retryable: error.retryable,
    recoveryAction: error.recoveryAction,
  };

  for (const [key, value] of Object.entries(error.diagnostics ?? {})) {
    if (isTelemetryValue(value)) {
      attributes[key] = value;
    }
  }
  return attributes;
}
