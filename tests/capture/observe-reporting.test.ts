import { Observe } from "expo-observe";

import { createCaptureError } from "@/core/capture/errors";
import {
  redactPersonalText,
  reportCaptureFailure,
  reportHandledError,
} from "@/core/telemetry/observe";
import { reportRecorderFailure } from "@/core/telemetry/recorder";

const reportError = jest.mocked(Observe.reportError);

function lastReported(): Error {
  const reported: unknown = reportError.mock.calls.at(-1)?.[0];
  if (!(reported instanceof Error)) {
    throw new Error("nothing was reported");
  }
  return reported;
}

beforeEach(() => {
  reportError.mockClear();
});

describe("personal text redaction", () => {
  it.each([
    [
      "Failed to save file:///var/mobile/Containers/Data/Application/ABC/Documents/recordings/set-1/a.mp4 now",
      "Failed to save <path> now",
    ],
    ["Could not open content://media/external/video/42", "Could not open <path>"],
    [
      "No such file at /data/user/0/com.ramimaalouf.openmulticam/files/recordings/set-1",
      "No such file at <path>",
    ],
    ["path=/Users/someone/Library/take.mov", "path=<path>"],
    ["“Morning walk” couldn’t be moved.", "“<name>” couldn’t be moved."],
    ['The file "Morning walk.mp4" is missing', "The file “<name>” is missing"],
  ])("removes uris, paths and quoted names from %j", (raw, safe) => {
    expect(redactPersonalText(raw)).toBe(safe);
  });

  it("keeps plain failure text that names nothing personal", () => {
    const text = "Call to function 'ExpoMediaLibrary.saveToLibraryAsync' has been rejected. Storage is full.";

    expect(redactPersonalText(text)).toBe(text);
  });
});

describe("handled error reports", () => {
  it("names where the failure happened and keeps the original frames without the raw message", () => {
    const error = new TypeError("Could not write /var/mobile/Containers/Data/Application/ABC/take.mp4");
    error.stack = [
      "TypeError: Could not write /var/mobile/Containers/Data/Application/ABC/take.mp4",
      "    at saveToPhotos (index.ios.bundle:1:200)",
      "    at anonymous (index.ios.bundle:1:300)",
    ].join("\n");

    reportHandledError("take.save", error);

    const reported = lastReported();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reported.name).toBe("TypeError");
    expect(reported.message).toBe("take.save failed: Could not write <path>");
    expect(reported.stack).toBe(
      [
        "TypeError: take.save failed: Could not write <path>",
        "    at saveToPhotos (index.ios.bundle:1:200)",
        "    at anonymous (index.ios.bundle:1:300)",
      ].join("\n"),
    );
  });

  it("falls back to the report's own frames when the error has none", () => {
    const error = new Error("offline");
    error.stack = undefined;

    reportHandledError("donation.status", error);

    const reported = lastReported();
    expect(reported.message).toBe("donation.status failed: offline");
    expect(reported.stack?.split("\n")[0]).toBe("Error: donation.status failed: offline");
    expect(reported.stack?.split("\n").length).toBeGreaterThan(1);
  });

  it("reports only the type of a thrown value that is not an error", () => {
    reportHandledError("take.share", "secret take name");
    reportHandledError("take.share", { path: "/private/take.mp4" });

    const [stringReport, objectReport] = reportError.mock.calls.map(([value]) => value as Error);
    expect(stringReport?.message).toBe("take.share failed: thrown value of type string");
    expect(objectReport?.message).toBe("take.share failed: thrown value of type object");
    expect(JSON.stringify(reportError.mock.calls)).not.toContain("secret");
    expect(stringReport?.stack).not.toContain("secret");
    expect(objectReport?.stack).not.toContain("/private");
  });
});

describe("capture failure reports", () => {
  it("reports the stable code instead of the user-facing message", () => {
    reportCaptureFailure("configure", createCaptureError("configuration_unavailable"));

    const reported = lastReported();
    expect(reported.name).toBe("CaptureError");
    expect(reported.message).toBe("capture.configure failed: configuration_unavailable");
    expect(reported.stack?.startsWith("CaptureError: capture.configure failed")).toBe(true);
  });

  it("reports recorder failures to expo observe even without the development recorder", async () => {
    await reportRecorderFailure("stop", {
      ...createCaptureError("recording_stop_failed"),
      diagnostics: { framesAppended: 0 },
    });

    expect(lastReported().message).toBe("capture.stop failed: recording_stop_failed");
  });
});
