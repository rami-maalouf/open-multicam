import fixture from "./fixtures/android-recovery.json";

import {
  playableClipUris,
  recordingDurationMs,
  recordingHealth,
  type RecordingLibraryEntry,
} from "@/core/library/entry";
import { parseRecordingSetManifest } from "@/core/library/manifest-schema";
import type { RecordingSetManifestV1 } from "@/core/library/manifest";

// the android recovery rules are tested against the same cases in RecoveryContractTest.kt
function entryFor(manifest: RecordingSetManifestV1): RecordingLibraryEntry {
  return {
    ...manifest,
    directoryUri: `file:///recordings/${manifest.recordingSetId}/`,
    clipUris: manifest.clips.map((clip) => ({
      clipId: clip.id,
      uri: `file:///recordings/${manifest.recordingSetId}/${clip.relativePath}`,
    })),
  };
}

const recoveredCase = fixture.cases.find((testCase) => testCase.health === "recovered");

describe("android recovery contract", () => {
  it.each(fixture.cases.map((testCase) => [testCase.name, testCase] as const))(
    "%s stays valid under the manifest schema",
    (_name, testCase) => {
      expect(parseRecordingSetManifest(testCase.staging).ok).toBe(true);
      const parsed = parseRecordingSetManifest(testCase.expected);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(recordingHealth(entryFor(parsed.value))).toBe(testCase.health);
    },
  );

  it("rejects the old recovery shape that marked playable clips ready", () => {
    if (recoveredCase === undefined) throw new Error("fixture is missing a recovered take");
    const recovered = recoveredCase.expected;
    const broken = {
      ...recovered,
      clips: recovered.clips.map((clip) =>
        clip.status === "recoverable" ? { ...clip, status: "ready", issue: null } : clip,
      ),
    };
    expect(parseRecordingSetManifest(broken).ok).toBe(false);
  });

  it("offers only the playable videos of a recovered take and its real length", () => {
    const parsed = parseRecordingSetManifest(recoveredCase?.expected);
    if (!parsed.ok) throw new Error("fixture is invalid");
    const entry = entryFor(parsed.value);
    expect(playableClipUris(entry).map((clip) => clip.clipId)).toEqual([
      "c1a2b3c4-0000-4000-8000-00000000000a",
    ]);
    expect(recordingDurationMs(entry)).toBe(4_120);
  });
});
