import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseRecordingSetManifest } from "../../src/core/library/manifest-schema";

export function recordingProof(mode: string) {
  const device = process.env.OPENMULTICAM_E2E_DEVICE_UDID;
  if (!device || process.env.OPENMULTICAM_HARDWARE_RECORDING_APPROVED !== "1") throw new Error("physical media inspection requires the selected approved device");
  const destination = resolve(`.artifacts/hardware-captures/${mode}-${Date.now()}`);
  mkdirSync(destination, { recursive: true });
  execFileSync("xcrun", ["devicectl", "device", "copy", "from", "--device", device, "--domain-type", "appDataContainer", "--domain-identifier", "com.ramimaalouf.openmulticam.e2e", "--source", "Documents/OpenMulticam/Recordings", "--destination", destination, "--quiet"], { stdio: "pipe" });
  const manifests: string[] = [];
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name === "manifest.json") manifests.push(path);
    }
  }
  visit(destination);
  if (manifests.length !== 1) throw new Error("expected only the newly captured take in the isolated app");
  const manifestPath = manifests[0];
  if (!manifestPath) throw new Error("new take manifest is missing");
  const parsed = parseRecordingSetManifest(JSON.parse(readFileSync(manifestPath, "utf8")));
  if (!parsed.ok) throw new Error("finalized native manifest does not satisfy the production schema");
  const manifest = parsed.value;
  if (manifest.mode !== mode) throw new Error("the finalized mode differs from the chosen camera style");
  const directory = manifestPath.slice(0, -"manifest.json".length);
  const clips = manifest.clips.map((clip) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", join(directory, clip.relativePath)], { encoding: "utf8" })));
  writeFileSync(join(destination, "proof.json"), JSON.stringify({ manifest, clips }, null, 2));
  return { manifest, clips };
}
