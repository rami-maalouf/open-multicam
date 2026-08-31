import {
  CURRENT_RECORDING_MANIFEST_VERSION,
  RECORDING_MANIFEST_OUTCOMES,
} from "@/core/library/manifest";
import {
  decodeRecordingSetManifest,
  parseRecordingSetManifest,
} from "@/core/library/manifest-schema";
import {
  recordingManifestFixtures,
  recordingOutcomeFixtures,
} from "@/testing/recording-fixtures";

describe("recording manifest version 1", () => {
  it.each([
    ["single", ["single"]],
    ["discrete", ["cameraA", "cameraB"]],
    ["pip", ["composite"]],
    ["split", ["composite"]],
  ] as const)("round-trips the %s output shape", (mode, expectedRoles) => {
    const fixture = recordingManifestFixtures[mode];
    const result = decodeRecordingSetManifest(JSON.stringify(fixture));

    expect(result).toEqual({ ok: true, value: fixture });
    if (result.ok) {
      expect(result.value.mode).toBe(mode);
      expect(result.value.clips.map((clip) => clip.role)).toEqual(
        expectedRoles,
      );
      expect(result.value.schemaVersion).toBe(
        CURRENT_RECORDING_MANIFEST_VERSION,
      );
    }
  });

  it.each(RECORDING_MANIFEST_OUTCOMES)(
    "preserves the visible %s outcome",
    (outcome) => {
      const fixture = recordingOutcomeFixtures[outcome];
      const result = parseRecordingSetManifest(fixture);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.outcome.kind).toBe(outcome);
      }
    },
  );

  it("preserves camera A and B identity in discrete output", () => {
    const result = parseRecordingSetManifest(
      recordingManifestFixtures.discrete,
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.value.mode === "discrete") {
      expect(result.value.cameraA.id).toBe("back-wide");
      expect(result.value.cameraB.id).toBe("front-wide");
      expect(result.value.clips[0].role).toBe("cameraA");
      expect(result.value.clips[1].role).toBe("cameraB");
    }
  });

  it("keeps original files visible when a future version is encountered", () => {
    const result = parseRecordingSetManifest({
      ...recordingManifestFixtures.single,
      schemaVersion: CURRENT_RECORDING_MANIFEST_VERSION + 1,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "unsupported-version",
        discoveredVersion: CURRENT_RECORDING_MANIFEST_VERSION + 1,
        supportedVersion: CURRENT_RECORDING_MANIFEST_VERSION,
        preserveOriginal: true,
      },
    });
  });

  it("returns a preserve-in-place result for invalid JSON", () => {
    expect(decodeRecordingSetManifest("{not-json")).toEqual({
      ok: false,
      error: {
        kind: "invalid-json",
        preserveOriginal: true,
      },
    });
  });

  it.each([
    null,
    {},
    { ...recordingManifestFixtures.single, schemaVersion: 0 },
    { ...recordingManifestFixtures.single, recordingSetId: "" },
    { ...recordingManifestFixtures.single, mode: "spatial" },
    { ...recordingManifestFixtures.single, preset: null },
    { ...recordingManifestFixtures.single, audio: null },
    {
      ...recordingManifestFixtures.single,
      audio: { kind: "present", route: null },
    },
    { ...recordingManifestFixtures.single, outcome: null },
    {
      ...recordingManifestFixtures.single,
      clips: [
        {
          ...recordingManifestFixtures.single.clips[0],
          relativePath: "/private/capture.mov",
        },
      ],
    },
    {
      ...recordingManifestFixtures.single,
      clips: [
        {
          ...recordingManifestFixtures.single.clips[0],
          relativePath: "../capture.mov",
        },
      ],
    },
    {
      ...recordingManifestFixtures.single,
      clips: [
        {
          ...recordingManifestFixtures.single.clips[0],
          role: "cameraA",
        },
      ],
    },
    {
      ...recordingManifestFixtures.discrete,
      clips: [recordingManifestFixtures.discrete.clips[0]],
    },
    {
      ...recordingManifestFixtures.discrete,
      cameraB: recordingManifestFixtures.discrete.cameraA,
    },
    {
      ...recordingManifestFixtures.discrete,
      clips: [
        recordingManifestFixtures.discrete.clips[0],
        {
          ...recordingManifestFixtures.discrete.clips[1],
          id: recordingManifestFixtures.discrete.clips[0].id,
        },
      ],
    },
    {
      ...recordingManifestFixtures.pip,
      composition: null,
    },
    {
      ...recordingManifestFixtures.pip,
      composition: {
        ...recordingManifestFixtures.pip.composition,
        inset: {
          ...recordingManifestFixtures.pip.composition.inset,
          x: 1.1,
        },
      },
    },
    {
      ...recordingManifestFixtures.pip,
      clips: [
        {
          ...recordingManifestFixtures.pip.clips[0],
          status: "ready",
          media: {
            ...recordingManifestFixtures.pip.clips[0].media,
            playable: false,
          },
        },
      ],
    },
    {
      ...recordingOutcomeFixtures.staging,
      outcome: recordingManifestFixtures.single.outcome,
    },
    {
      ...recordingOutcomeFixtures.recoverable,
      outcome: {
        ...recordingOutcomeFixtures.recoverable.outcome,
        playableClipIds: ["missing-clip"],
      },
    },
    {
      ...recordingManifestFixtures.split,
      preset: {
        ...recordingManifestFixtures.split.preset,
        frameRate: 60,
      },
    },
  ])("rejects malformed version 1 data without discarding it", (input) => {
    expect(parseRecordingSetManifest(input)).toEqual({
      ok: false,
      error: {
        kind: "invalid-schema",
        preserveOriginal: true,
      },
    });
  });
});
