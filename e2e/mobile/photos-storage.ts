import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fixtureRoot } from "./library-fixtures";

export function photosVideos(): string[] {
  fixtureRoot();
  const root = join(homedir(), "Library/Developer/CoreSimulator/Devices", process.env.OPENMULTICAM_SIMULATOR_UDID!, "data/Media/DCIM");
  const files: string[] = [];
  function visit(directory: string) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(mp4|mov)$/i.test(entry.name)) files.push(path);
    }
  }
  visit(root);
  return files;
}

export function photoVideoMetadata(path: string) {
  if (!photosVideos().includes(path)) throw new Error("only a video in the owned simulator Photos storage may be inspected");
  return JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name", "-show_entries", "format=duration", "-of", "json", path], { encoding: "utf8" }));
}
