import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Locator } from "e2e";

export async function playbackSample(video: Locator, application: Locator, label: string) {
  const bounds = await video.boundingBox();
  const viewport = await application.boundingBox();
  if (!bounds || !viewport) throw new Error("video or application has no visible bounds");
  const folder = ".artifacts/playback-frames";
  mkdirSync(folder, { recursive: true });
  const path = join(folder, `${label}-${Date.now()}.png`);
  const udid = process.env.OPENMULTICAM_SIMULATOR_UDID;
  if (!udid) throw new Error("isolated simulator required");
  execFileSync("xcrun", ["simctl", "io", udid, "screenshot", path], { stdio: "pipe" });
  const region = `scale=${Math.round(viewport.width)}:${Math.round(viewport.height)},crop=16:16:${Math.round(bounds.x + bounds.width * 0.15)}:${Math.round(bounds.y + bounds.height * 0.3)}`;
  return execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path, "-vf", region, "-f", "md5", "-"], { encoding: "utf8" }).trim();
}
