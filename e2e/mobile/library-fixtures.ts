import { parseRecordingSetManifest } from "../../src/core/library/manifest-schema";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireOwnedSimulator } from "./simulator-ownership";

export const fixtureId = "e2e00000-0000-4000-8000-000000000001";
export const corruptId = "e2e00000-0000-4000-8000-000000000002";
export const bundleId = "com.ramimaalouf.openmulticam";

export function fixtureRoot() {
  const udid = requireOwnedSimulator();
  const container = execFileSync("xcrun", ["simctl", "get_app_container", udid, bundleId, "data"], { encoding: "utf8" }).trim();
  return join(container, "Documents/OpenMulticam/Recordings");
}

export function cleanFixtures() {
  const root = fixtureRoot();
  for (const id of [fixtureId, corruptId]) rmSync(join(root, id), { recursive: true, force: true });
}

export function seedTake(mode: "single" | "discrete" | "pip" | "split" = "single") {
  const root = join(fixtureRoot(), fixtureId);
  mkdirSync(root, { recursive: true });
  const video = join(root, "single.mp4");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=teal:s=1080x1920:r=30:d=60", "-vf", "drawbox=x=0:y=0:w=iw:h=ih:color=red:t=fill:enable=gte(mod(t\\,2)\\,1)", "-c:v", "libx264", "-pix_fmt", "yuv420p", video]);
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height,codec_name", "-show_entries", "format=duration", "-of", "json", video], { encoding: "utf8" }));
  const stream = probe.streams[0];
  if (stream?.codec_name !== "h264" || stream.width !== 1080 || stream.height !== 1920) throw new Error("fixture video does not match its release preset");
  const durationMs = Math.round(Number(probe.format.duration) * 1000);
  const clips = [{ id: "clip-a", role: mode === "discrete" ? "cameraA" : mode === "single" ? "single" : "composite", relativePath: "single.mp4", status: "ready", media: { width: stream.width, height: stream.height, durationMs, fileSizeBytes: statSync(video).size, videoTrackCount: 1, audioTrackCount: 0, playable: true }, issue: null }];
  if (mode === "discrete") {
    const second = join(root, "second.mp4");
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=blue:s=1080x1920:r=30:d=60", "-c:v", "libx264", "-pix_fmt", "yuv420p", second]);
    clips.push({ ...clips[0]!, id: "clip-b", role: "cameraB", relativePath: "second.mp4", media: { ...clips[0]!.media, fileSizeBytes: statSync(second).size } });
  }
  const manifest = {
    kind: "recording-set-manifest", schemaVersion: 1, recordingSetId: fixtureId, name: "E2E synthetic take", createdAtUtcMs: 1788195600000, startedAtPtsSeconds: 0,
    mode, cameraA: { id: "fixture-wide", label: "Wide", position: "back" },
    ...(mode !== "single" ? { cameraB: { id: "fixture-front", label: "Front", position: "front" } } : {}),
    preset: { profile: "core1080p", orientation: "portrait", width: 1080, height: 1920, frameRate: 30, codec: "h264", bitrate: 12000000, stabilization: "standard" },
    audio: { kind: "absent", reason: "permission-not-granted" }, warnings: [], outcome: { kind: "ready", durationMs, finalizedAtUtcMs: 1788195600000 + durationMs }, clips,
    ...(mode === "pip" ? { composition: { kind: "pip", primaryCamera: "A", visible: true, inset: { x: 0.68, y: 0.08, width: 0.28, height: 0.28 } } } : {}),
    ...(mode === "split" ? { composition: { kind: "split", division: "horizontal", cameraAPlacement: "leading" } } : {}),
  };
  const parsed = parseRecordingSetManifest(manifest);
  if (!parsed.ok) throw new Error(`invalid synthetic manifest: ${JSON.stringify(parsed.error)}`);
  writeFileSync(join(root, "manifest.json"), JSON.stringify(parsed.value));
}

export function seedCorruptTake() {
  const root = join(fixtureRoot(), corruptId);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "manifest.json"), "{invalid-json");
}
