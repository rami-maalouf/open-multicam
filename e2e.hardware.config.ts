import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runtimeDigest } from "./e2e/mobile/build-identity";
import { execFileSync } from "node:child_process";
import { mobile } from "@e2e-dev/mobile";
import type { E2EConfig } from "e2e";

if (process.env.OPENMULTICAM_HARDWARE_RECORDING_APPROVED !== "1") throw new Error("hardware run requires an unlocked, safely framed phone and OPENMULTICAM_HARDWARE_RECORDING_APPROVED=1");
const device = process.env.OPENMULTICAM_E2E_DEVICE_NAME;
if (!device || !process.env.OPENMULTICAM_E2E_DEVICE_UDID) throw new Error("set the uniquely named paired iPhone in OPENMULTICAM_E2E_DEVICE_NAME");
execFileSync("xcrun", ["devicectl", "list", "devices", "--json-output", resolve(".artifacts/hardware-device-inventory.json")]);
const inventory = JSON.parse(readFileSync(".artifacts/hardware-device-inventory.json", "utf8"));
const matches = inventory.result.devices.filter((entry: { deviceProperties?: { name?: string }; hardwareProperties?: { udid?: string } }) => entry.deviceProperties?.name === device);
if (matches.length !== 1 || matches[0].hardwareProperties?.udid !== process.env.OPENMULTICAM_E2E_DEVICE_UDID) throw new Error("device name must resolve uniquely to the explicitly selected paired iPhone");
process.env.AGENT_DEVICE_STATE_DIR = resolve(".artifacts/agent-device-hardware");
process.env.AGENT_DEVICE_IOS_TEAM_ID = "3V2UU7RRK9";
process.env.AGENT_DEVICE_IOS_BUNDLE_ID = "com.ramimaalouf.openmulticam.e2e.runner";
const appPath = resolve(".artifacts/hardware-build/Build/Products/Release-iphoneos/OpenMulticamE2E.app");
const identifier = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", join(appPath, "Info.plist")], { encoding: "utf8" }).trim();
if (identifier !== "com.ramimaalouf.openmulticam.e2e") throw new Error("refusing to install a production bundle on the physical phone");
execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], { stdio: "inherit" });
const receipt = JSON.parse(readFileSync(`${appPath}.e2e-build.json`, "utf8"));
if (receipt.deviceUdid !== process.env.OPENMULTICAM_E2E_DEVICE_UDID) throw new Error("signed artifact was prepared for a different selected device");
if (receipt.runtimeDigest !== runtimeDigest() || receipt.bundleDigest !== createHash("sha256").update(readFileSync(join(appPath, "main.jsbundle"))).digest("hex")) throw new Error("signed hardware build is stale; rebuild before installing");
const acceptance = process.env.OPENMULTICAM_E2E_HARDWARE_SUITE ?? "capture";
if (acceptance !== "capture" && acceptance !== "permission-recovery") throw new Error("hardware suite must be capture or permission-recovery");
export default {
  targets: [{ name: "iphone", engine: mobile({ platform: "ios", device, session: "openmulticam-hardware" }), app: { bundleId: identifier, appPath } }],
  tests: [`e2e/hardware/${acceptance}.e2e.ts`], workers: 1, retries: 0, timeout: 180_000, launchTimeout: 180_000,
  output: ".artifacts/e2e-hardware", reporters: ["list", "markdown", "junit"],
} satisfies E2EConfig;
