import { Observe } from "expo-observe";

import type { CaptureError } from "@/core/capture/errors";

// every handled failure the app reports to expo observe, named by where it happened. the name
// leads the reported message, so the dashboard groups one failure in one place together.
export type HandledFailure =
  | "capture.prepare"
  | "library.read"
  | "take.load"
  | "take.rename"
  | "take.share"
  | "take.save"
  | "take.delete"
  | "donation.status"
  | "donation.purchase"
  | "donation.restore";

export type CaptureFailurePhase = "validate" | "configure" | "start" | "stop";

// reports leave the device and stay in the dashboard for 90 days, so they never carry a uri, a
// file path or a quoted name. system file errors quote file names, for example “take 1”.
export function redactPersonalText(text: string): string {
  return text
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "<path>")
    .replace(/(^|[\s(=:])\/[^\s"“”()]+/g, "$1<path>")
    .replace(/[“"][^“”"]*[”"]/g, "“<name>”");
}

function stackFrames(error: Error): string[] {
  return (error.stack ?? "").split("\n").filter((line) => /^\s+at /.test(line));
}

// the first line of a stack repeats the raw message, so it is rebuilt from the safe one. the
// frames stay, because the dashboard maps them back to source files.
function reportable(name: string, message: string, frames: string[]): Error {
  const reported = new Error(message);
  reported.name = name;
  const ownFrames = frames.length > 0 ? frames : stackFrames(reported);
  reported.stack = [`${name}: ${message}`, ...ownFrames].join("\n");
  return reported;
}

export function reportHandledError(failure: HandledFailure, error: unknown): void {
  if (!(error instanceof Error)) {
    // a thrown string or object can hold anything, so only its type is reported
    Observe.reportError(reportable("Error", `${failure} failed: thrown value of type ${typeof error}`, []));
    return;
  }

  Observe.reportError(
    reportable(
      error.name,
      `${failure} failed: ${redactPersonalText(error.message)}`,
      stackFrames(error),
    ),
  );
}

// capture failures come back as result values with a stable code. the code alone names the
// failure, and its user-facing message adds nothing for the dashboard.
export function reportCaptureFailure(
  phase: CaptureFailurePhase,
  error: CaptureError,
): void {
  Observe.reportError(reportable("CaptureError", `capture.${phase} failed: ${error.code}`, []));
}
