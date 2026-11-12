import type { RecordingSetManifestV1 } from "@/core/library/manifest";

export type RecordingClipUri = Readonly<{
  clipId: string;
  uri: string;
}>;

export type RecordingLibraryEntry = RecordingSetManifestV1 &
  Readonly<{
    directoryUri: string;
    clipUris: readonly RecordingClipUri[];
  }>;

export function recordingDisplayName(entry: RecordingLibraryEntry): string {
  if (entry.name !== null) {
    return entry.name;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(entry.createdAtUtcMs));
}

// ready takes are whole; recovered takes were interrupted but kept at least one
// playable video; damaged takes have nothing left to play and can only be deleted
export type RecordingHealth = "ready" | "recovered" | "damaged";

export function recordingHealth(entry: RecordingLibraryEntry): RecordingHealth {
  if (entry.outcome.kind === "ready") {
    return "ready";
  }
  return playableClipUris(entry).length > 0 ? "recovered" : "damaged";
}

export function playableClipUris(
  entry: RecordingLibraryEntry,
): readonly RecordingClipUri[] {
  if (entry.outcome.kind === "ready") {
    return entry.clipUris;
  }
  const playable = new Set<string>(
    entry.clips.flatMap((clip) => (clip.media === null ? [] : [clip.id])),
  );
  return entry.clipUris.filter((clip) => playable.has(clip.clipId));
}

export function recordingDurationMs(entry: RecordingLibraryEntry): number {
  if (entry.outcome.kind === "ready") {
    return entry.outcome.durationMs;
  }
  const durations = entry.clips.flatMap((clip) =>
    clip.media === null ? [] : [clip.media.durationMs],
  );
  return durations.length === 0 ? 0 : Math.max(...durations);
}

export function formatRecordingDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
