import {
  formatRecordingDuration,
  recordingDisplayName,
  recordingDurationMs,
  type RecordingLibraryEntry,
} from "@/core/library/entry";
import { recordingManifestFixtures } from "@/testing/recording-fixtures";

const entry = {
  ...recordingManifestFixtures.single,
  directoryUri: "file:///recordings/set-single/",
  clipUris: [
    {
      clipId: "clip-single",
      uri: "file:///recordings/set-single/single.mp4",
    },
  ],
} satisfies RecordingLibraryEntry;

describe("recording library entry helpers", () => {
  it("uses a custom name when one exists", () => {
    expect(recordingDisplayName({ ...entry, name: "First light" })).toBe(
      "First light",
    );
  });

  it("formats unnamed takes and durations safely", () => {
    expect(recordingDisplayName(entry)).toEqual(expect.any(String));
    expect(recordingDurationMs(entry)).toBe(4_000);
    expect(formatRecordingDuration(65_999)).toBe("1:05");
    expect(formatRecordingDuration(-5_000)).toBe("0:00");
  });

  it("uses zero duration for a non-ready take", () => {
    expect(
      recordingDurationMs({
        ...entry,
        outcome: { kind: "staging" },
        clips: [
          {
            ...entry.clips[0],
            status: "staging",
            media: null,
            issue: null,
          },
        ],
      }),
    ).toBe(0);
  });
});
