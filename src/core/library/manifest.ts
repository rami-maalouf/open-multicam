import type {
  CameraPosition,
  CaptureCodec,
  CaptureFrameRate,
  CaptureMode,
  CaptureOrientation,
  CaptureProfile,
  CaptureStabilization,
  CaptureStopReason,
} from "@/core/capture/types";

export const CURRENT_RECORDING_MANIFEST_VERSION = 1 as const;
export const RECORDING_MANIFEST_OUTCOMES = [
  "staging",
  "ready",
  "recoverable",
  "interrupted",
  "corrupt",
] as const;

export type RecordingManifestOutcomeKind =
  (typeof RECORDING_MANIFEST_OUTCOMES)[number];

export type RecordingCamera = Readonly<{
  id: string;
  label: string;
  position: CameraPosition;
}>;

export type RecordingPreset = Readonly<{
  profile: CaptureProfile;
  orientation: CaptureOrientation;
  width: number;
  height: number;
  frameRate: CaptureFrameRate;
  codec: CaptureCodec;
  bitrate: number;
  stabilization: CaptureStabilization;
}>;

export type RecordingAudio =
  | Readonly<{
      kind: "present";
      route: Readonly<{
        label: string;
        channelCount: number;
        sampleRateHz: number;
      }>;
    }>
  | Readonly<{
      kind: "absent";
      reason: "permission-not-granted";
    }>;

export type RecordingWarning = Readonly<{
  kind: "pressure" | "interruption" | "frame-drop" | "recovery";
  message: string;
}>;

export type ValidatedClipMedia = Readonly<{
  width: number;
  height: number;
  durationMs: number;
  fileSizeBytes: number;
  videoTrackCount: 1;
  audioTrackCount: 0 | 1;
  playable: true;
}>;

export type RecordingClipRole =
  | "single"
  | "cameraA"
  | "cameraB"
  | "composite";

type RecordingClipOutcome =
  | Readonly<{
      status: "staging";
      media: null;
      issue: null;
    }>
  | Readonly<{
      status: "ready";
      media: ValidatedClipMedia;
      issue: null;
    }>
  | Readonly<{
      status: "recoverable" | "interrupted";
      media: ValidatedClipMedia | null;
      issue: string;
    }>
  | Readonly<{
      status: "corrupt";
      media: null;
      issue: string;
    }>;

export type RecordingClip<Role extends RecordingClipRole = RecordingClipRole> =
  Readonly<{
    id: string;
    role: Role;
    relativePath: string;
  }> &
    RecordingClipOutcome;

export type RecordingManifestOutcome =
  | Readonly<{ kind: "staging" }>
  | Readonly<{
      kind: "ready";
      durationMs: number;
      finalizedAtUtcMs: number;
    }>
  | Readonly<{
      kind: "recoverable";
      reason:
        | "finalization-incomplete"
        | "manifest-rebuild-needed"
        | "partial-output";
      playableClipIds: readonly string[];
    }>
  | Readonly<{
      kind: "interrupted";
      reason: CaptureStopReason;
      playableClipIds: readonly string[];
    }>
  | Readonly<{
      kind: "corrupt";
      reason: "missing-file" | "unreadable-track" | "invalid-media";
    }>;

type RecordingManifestBase = Readonly<{
  kind: "recording-set-manifest";
  schemaVersion: typeof CURRENT_RECORDING_MANIFEST_VERSION;
  recordingSetId: string;
  name: string | null;
  createdAtUtcMs: number;
  startedAtPtsSeconds: number | null;
  preset: RecordingPreset;
  audio: RecordingAudio;
  warnings: readonly RecordingWarning[];
  outcome: RecordingManifestOutcome;
}>;

type SingleRecordingManifest = Readonly<{
  mode: "single";
  cameraA: RecordingCamera;
  cameraB?: never;
  clips: readonly [RecordingClip<"single">];
}>;

type DiscreteRecordingManifest = Readonly<{
  mode: "discrete";
  cameraA: RecordingCamera;
  cameraB: RecordingCamera;
  clips: readonly [RecordingClip<"cameraA">, RecordingClip<"cameraB">];
}>;

type PipRecordingManifest = Readonly<{
  mode: "pip";
  cameraA: RecordingCamera;
  cameraB: RecordingCamera;
  clips: readonly [RecordingClip<"composite">];
  composition: Readonly<{
    kind: "pip";
    primaryCamera: "A" | "B";
    visible: boolean;
    inset: Readonly<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  }>;
}>;

type SplitRecordingManifest = Readonly<{
  mode: "split";
  cameraA: RecordingCamera;
  cameraB: RecordingCamera;
  clips: readonly [RecordingClip<"composite">];
  composition: Readonly<{
    kind: "split";
    division: "vertical" | "horizontal";
    cameraAPlacement: "leading" | "trailing";
  }>;
}>;

export type RecordingSetManifestV1 = RecordingManifestBase &
  (
    | SingleRecordingManifest
    | DiscreteRecordingManifest
    | PipRecordingManifest
    | SplitRecordingManifest
  );

export type RecordingManifestMode = RecordingSetManifestV1["mode"] &
  CaptureMode;

export type RecordingManifestReadError =
  | Readonly<{
      kind: "invalid-json";
      preserveOriginal: true;
    }>
  | Readonly<{
      kind: "invalid-schema";
      preserveOriginal: true;
    }>
  | Readonly<{
      kind: "unsupported-version";
      discoveredVersion: number;
      supportedVersion: typeof CURRENT_RECORDING_MANIFEST_VERSION;
      preserveOriginal: true;
    }>;
