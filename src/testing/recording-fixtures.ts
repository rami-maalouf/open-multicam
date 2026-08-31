import {
  CURRENT_RECORDING_MANIFEST_VERSION,
  type RecordingClip,
  type RecordingManifestOutcomeKind,
  type RecordingSetManifestV1,
  type ValidatedClipMedia,
} from "@/core/library/manifest";
import type { CaptureMode } from "@/core/capture/types";

const backCamera = {
  id: "back-wide",
  label: "Wide",
  position: "back",
} as const;

const frontCamera = {
  id: "front-wide",
  label: "Front",
  position: "front",
} as const;

const landscapePreset = {
  profile: "core1080p",
  orientation: "landscape",
  width: 1920,
  height: 1080,
  frameRate: 30,
  codec: "h264",
  bitrate: 12_000_000,
  stabilization: "standard",
} as const;

const portraitPreset = {
  ...landscapePreset,
  orientation: "portrait",
  width: 1080,
  height: 1920,
} as const;

const presentAudio = {
  kind: "present",
  route: {
    label: "Built-in Microphone",
    channelCount: 1,
    sampleRateHz: 48_000,
  },
} as const;

const media: ValidatedClipMedia = {
  width: 1920,
  height: 1080,
  durationMs: 4_000,
  fileSizeBytes: 6_000_000,
  videoTrackCount: 1,
  audioTrackCount: 1,
  playable: true,
};

function readyClip<Role extends RecordingClip["role"]>(
  id: string,
  role: Role,
  relativePath: string,
): RecordingClip<Role> {
  return {
    id,
    role,
    relativePath,
    status: "ready",
    media,
    issue: null,
  };
}

const common = {
  kind: "recording-set-manifest",
  schemaVersion: CURRENT_RECORDING_MANIFEST_VERSION,
  name: null,
  createdAtUtcMs: 1_788_195_600_000,
  startedAtPtsSeconds: 42.5,
  audio: presentAudio,
  warnings: [],
  outcome: {
    kind: "ready",
    durationMs: 4_000,
    finalizedAtUtcMs: 1_788_195_604_000,
  },
} as const;

export const recordingManifestFixtures = {
  single: {
    ...common,
    recordingSetId: "set-single",
    mode: "single",
    cameraA: frontCamera,
    preset: portraitPreset,
    audio: {
      kind: "absent",
      reason: "permission-not-granted",
    },
    clips: [readyClip("clip-single", "single", "clips/single.mov")],
  },
  discrete: {
    ...common,
    recordingSetId: "set-discrete",
    mode: "discrete",
    cameraA: backCamera,
    cameraB: frontCamera,
    preset: landscapePreset,
    warnings: [
      {
        kind: "frame-drop",
        message: "Two preview frames were dropped without affecting output.",
      },
    ],
    clips: [
      readyClip("clip-a", "cameraA", "clips/A.mov"),
      readyClip("clip-b", "cameraB", "clips/B.mov"),
    ],
  },
  pip: {
    ...common,
    recordingSetId: "set-pip",
    mode: "pip",
    cameraA: backCamera,
    cameraB: frontCamera,
    preset: landscapePreset,
    composition: {
      kind: "pip",
      primaryCamera: "A",
      visible: true,
      inset: { x: 0.68, y: 0.08, width: 0.28, height: 0.28 },
    },
    clips: [readyClip("clip-pip", "composite", "clips/composite.mov")],
  },
  split: {
    ...common,
    recordingSetId: "set-split",
    mode: "split",
    cameraA: backCamera,
    cameraB: frontCamera,
    preset: landscapePreset,
    composition: {
      kind: "split",
      division: "vertical",
      cameraAPlacement: "leading",
    },
    clips: [readyClip("clip-split", "composite", "clips/composite.mov")],
  },
} as const satisfies Record<CaptureMode, RecordingSetManifestV1>;

const singleReadyClip = recordingManifestFixtures.single.clips[0];

export const recordingOutcomeFixtures = {
  staging: {
    ...recordingManifestFixtures.single,
    recordingSetId: "set-staging",
    startedAtPtsSeconds: null,
    outcome: { kind: "staging" },
    clips: [
      {
        ...singleReadyClip,
        status: "staging",
        media: null,
        issue: null,
      },
    ],
  },
  ready: recordingManifestFixtures.single,
  recoverable: {
    ...recordingManifestFixtures.single,
    recordingSetId: "set-recoverable",
    outcome: {
      kind: "recoverable",
      reason: "finalization-incomplete",
      playableClipIds: [singleReadyClip.id],
    },
    clips: [
      {
        ...singleReadyClip,
        status: "recoverable",
        issue: "The final library move can be retried.",
      },
    ],
  },
  interrupted: {
    ...recordingManifestFixtures.single,
    recordingSetId: "set-interrupted",
    outcome: {
      kind: "interrupted",
      reason: "backgrounded",
      playableClipIds: [singleReadyClip.id],
    },
    clips: [
      {
        ...singleReadyClip,
        status: "interrupted",
        issue: "Capture stopped when the app entered the background.",
      },
    ],
  },
  corrupt: {
    ...recordingManifestFixtures.single,
    recordingSetId: "set-corrupt",
    outcome: {
      kind: "corrupt",
      reason: "unreadable-track",
    },
    clips: [
      {
        ...singleReadyClip,
        status: "corrupt",
        media: null,
        issue: "The video track cannot be opened.",
      },
    ],
  },
} as const satisfies Record<
  RecordingManifestOutcomeKind,
  RecordingSetManifestV1
>;
