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

export function recordingDurationMs(entry: RecordingLibraryEntry): number {
  return entry.outcome.kind === "ready" ? entry.outcome.durationMs : 0;
}

export function formatRecordingDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
