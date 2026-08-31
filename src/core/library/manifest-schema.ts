import {
  CURRENT_RECORDING_MANIFEST_VERSION,
  RECORDING_MANIFEST_OUTCOMES,
  type RecordingClip,
  type RecordingClipRole,
  type RecordingManifestOutcome,
  type RecordingManifestReadError,
  type RecordingSetManifestV1,
  type ValidatedClipMedia,
} from "@/core/library/manifest";
import {
  CAPTURE_ORIENTATIONS,
  RELEASE_CAPTURE_MODES,
  RELEASE_FRAME_RATES,
} from "@/core/capture/types";
import { failure, success, type Result } from "@/core/results/result";

type ManifestReadResult = Result<
  RecordingSetManifestV1,
  RecordingManifestReadError
>;

const clipRoles: readonly RecordingClipRole[] = [
  "single",
  "cameraA",
  "cameraB",
  "composite",
];
const cameraPositions = ["front", "back", "unspecified"] as const;
const stabilizationModes = ["off", "standard", "cinematic"] as const;
const warningKinds = [
  "pressure",
  "interruption",
  "frame-drop",
  "recovery",
] as const;
const clipStatuses = [
  "staging",
  "ready",
  "recoverable",
  "interrupted",
  "corrupt",
] as const;
const recoveryReasons = [
  "finalization-incomplete",
  "manifest-rebuild-needed",
  "partial-output",
] as const;
const interruptionReasons = [
  "user-requested",
  "storage-critical",
  "system-pressure-critical",
  "backgrounded",
  "audio-route-lost",
  "media-services-reset",
  "writer-failed",
] as const;
const corruptReasons = [
  "missing-file",
  "unreadable-track",
  "invalid-media",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isOneOf<Value extends string | number>(
  value: unknown,
  values: readonly Value[],
): value is Value {
  return values.includes(value as Value);
}

function isRelativeRecordingPath(value: unknown): value is string {
  if (!isNonEmptyString(value) || value.startsWith("/") || value.includes("\\")) {
    return false;
  }

  return value
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function isRecordingName(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      value === value.trim() &&
      Array.from(value).length <= 120)
  );
}

function isCamera(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.label) &&
    isOneOf(value.position, cameraPositions)
  );
}

function isPreset(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const hasReleaseDimensions =
    (value.orientation === "portrait" &&
      value.width === 1080 &&
      value.height === 1920) ||
    (value.orientation === "landscape" &&
      value.width === 1920 &&
      value.height === 1080);

  return (
    value.profile === "core1080p" &&
    isOneOf(value.orientation, CAPTURE_ORIENTATIONS) &&
    hasReleaseDimensions &&
    isOneOf(value.frameRate, RELEASE_FRAME_RATES) &&
    value.codec === "h264" &&
    isPositiveInteger(value.bitrate) &&
    isOneOf(value.stabilization, stabilizationModes)
  );
}

function isAudio(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (value.kind === "absent") {
    return value.reason === "permission-not-granted";
  }

  if (value.kind !== "present" || !isRecord(value.route)) {
    return false;
  }

  return (
    isNonEmptyString(value.route.label) &&
    isPositiveInteger(value.route.channelCount) &&
    isPositiveInteger(value.route.sampleRateHz)
  );
}

function isWarning(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOneOf(value.kind, warningKinds) &&
    isNonEmptyString(value.message)
  );
}

function isValidatedMedia(value: unknown): value is ValidatedClipMedia {
  return (
    isRecord(value) &&
    isPositiveInteger(value.width) &&
    isPositiveInteger(value.height) &&
    isNonNegativeNumber(value.durationMs) &&
    isNonNegativeInteger(value.fileSizeBytes) &&
    value.videoTrackCount === 1 &&
    (value.audioTrackCount === 0 || value.audioTrackCount === 1) &&
    value.playable === true
  );
}

function isClip(value: unknown): value is RecordingClip {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isOneOf(value.role, clipRoles) ||
    !isRelativeRecordingPath(value.relativePath) ||
    !isOneOf(value.status, clipStatuses)
  ) {
    return false;
  }

  if (value.status === "staging") {
    return value.media === null && value.issue === null;
  }

  if (value.status === "ready") {
    return isValidatedMedia(value.media) && value.issue === null;
  }

  if (value.status === "corrupt") {
    return value.media === null && isNonEmptyString(value.issue);
  }

  return (
    (value.media === null || isValidatedMedia(value.media)) &&
    isNonEmptyString(value.issue)
  );
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isManifestOutcome(value: unknown): value is RecordingManifestOutcome {
  if (
    !isRecord(value) ||
    !isOneOf(value.kind, RECORDING_MANIFEST_OUTCOMES)
  ) {
    return false;
  }

  if (value.kind === "staging") {
    return true;
  }

  if (value.kind === "ready") {
    return (
      isNonNegativeNumber(value.durationMs) &&
      isNonNegativeInteger(value.finalizedAtUtcMs)
    );
  }

  if (value.kind === "recoverable") {
    return (
      isOneOf(value.reason, recoveryReasons) &&
      isStringArray(value.playableClipIds)
    );
  }

  if (value.kind === "interrupted") {
    return (
      isOneOf(value.reason, interruptionReasons) &&
      isStringArray(value.playableClipIds)
    );
  }

  return isOneOf(value.reason, corruptReasons);
}

function hasExpectedClipRoles(
  mode: string,
  clips: readonly RecordingClip[],
): boolean {
  if (mode === "single") {
    return clips.length === 1 && clips[0]?.role === "single";
  }

  if (mode === "discrete") {
    return (
      clips.length === 2 &&
      clips[0]?.role === "cameraA" &&
      clips[1]?.role === "cameraB"
    );
  }

  return clips.length === 1 && clips[0]?.role === "composite";
}

function hasConsistentOutcome(
  outcome: RecordingManifestOutcome,
  clips: readonly RecordingClip[],
): boolean {
  if (outcome.kind === "staging" || outcome.kind === "ready") {
    return clips.every((clip) => clip.status === outcome.kind);
  }

  if (outcome.kind === "corrupt") {
    return clips.some((clip) => clip.status === "corrupt");
  }

  const playableIds = new Set(
    clips.filter((clip) => clip.media !== null).map((clip) => clip.id),
  );

  return (
    clips.some((clip) => clip.status === outcome.kind) &&
    outcome.playableClipIds.every((id) => playableIds.has(id))
  );
}

function isNormalizedNumber(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1;
}

function hasValidModeShape(
  manifest: Record<string, unknown>,
  clips: readonly RecordingClip[],
): boolean {
  if (!isOneOf(manifest.mode, RELEASE_CAPTURE_MODES)) {
    return false;
  }

  if (!hasExpectedClipRoles(manifest.mode, clips) || !isCamera(manifest.cameraA)) {
    return false;
  }

  if (manifest.mode === "single") {
    return !("cameraB" in manifest) && !("composition" in manifest);
  }

  if (
    !isCamera(manifest.cameraB) ||
    (manifest.cameraA as Record<string, unknown>).id ===
      (manifest.cameraB as Record<string, unknown>).id
  ) {
    return false;
  }

  if (manifest.mode === "discrete") {
    return !("composition" in manifest);
  }

  if (!isRecord(manifest.composition)) {
    return false;
  }

  if (manifest.mode === "pip") {
    const inset = manifest.composition.inset;

    return (
      manifest.composition.kind === "pip" &&
      (manifest.composition.primaryCamera === "A" ||
        manifest.composition.primaryCamera === "B") &&
      typeof manifest.composition.visible === "boolean" &&
      isRecord(inset) &&
      isNormalizedNumber(inset.x) &&
      isNormalizedNumber(inset.y) &&
      isNormalizedNumber(inset.width) &&
      isNormalizedNumber(inset.height)
    );
  }

  return (
    manifest.composition.kind === "split" &&
    (manifest.composition.division === "vertical" ||
      manifest.composition.division === "horizontal") &&
    (manifest.composition.cameraAPlacement === "leading" ||
      manifest.composition.cameraAPlacement === "trailing")
  );
}

function isRecordingSetManifestV1(
  value: Record<string, unknown>,
): value is RecordingSetManifestV1 {
  if (
    value.kind !== "recording-set-manifest" ||
    value.schemaVersion !== CURRENT_RECORDING_MANIFEST_VERSION ||
    !isNonEmptyString(value.recordingSetId) ||
    !isRecordingName(value.name) ||
    !isNonNegativeInteger(value.createdAtUtcMs) ||
    !(
      value.startedAtPtsSeconds === null ||
      isNonNegativeNumber(value.startedAtPtsSeconds)
    ) ||
    !isPreset(value.preset) ||
    !isAudio(value.audio) ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every(isWarning) ||
    !Array.isArray(value.clips) ||
    !value.clips.every(isClip) ||
    !isManifestOutcome(value.outcome)
  ) {
    return false;
  }

  const clips = value.clips as RecordingClip[];
  const uniqueClipIds = new Set(clips.map((clip) => clip.id));

  return (
    uniqueClipIds.size === clips.length &&
    hasValidModeShape(value, clips) &&
    hasConsistentOutcome(value.outcome, clips)
  );
}

export function parseRecordingSetManifest(input: unknown): ManifestReadResult {
  if (!isRecord(input)) {
    return failure({ kind: "invalid-schema", preserveOriginal: true });
  }

  if (
    Number.isInteger(input.schemaVersion) &&
    (input.schemaVersion as number) > CURRENT_RECORDING_MANIFEST_VERSION
  ) {
    return failure({
      kind: "unsupported-version",
      discoveredVersion: input.schemaVersion as number,
      supportedVersion: CURRENT_RECORDING_MANIFEST_VERSION,
      preserveOriginal: true,
    });
  }

  if (!isRecordingSetManifestV1(input)) {
    return failure({ kind: "invalid-schema", preserveOriginal: true });
  }

  return success(input);
}

export function decodeRecordingSetManifest(json: string): ManifestReadResult {
  try {
    return parseRecordingSetManifest(JSON.parse(json));
  } catch {
    return failure({ kind: "invalid-json", preserveOriginal: true });
  }
}
