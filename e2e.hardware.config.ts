import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { mobile } from "@e2e-dev/mobile";
import type { E2EConfig } from "e2e";

if (process.env.OPENMULTICAM_HARDWARE_RECORDING_APPROVED !== "1") throw new Error("hardware run requires an unlocked, safely framed phone and OPENMULTICAM_HARDWARE_RECORDING_APPROVED=1");
const device = process.env.OPENMULTICAM_E2E_DEVICE_NAME;
if (!device) throw new Error("set the uniquely named paired iPhone in OPENMULTICAM_E2E_DEVICE_NAME");
process.env.AGENT_DEVICE_STATE_DIR = resolve(".artifacts/agent-device-hardware");
process.env.AGENT_DEVICE_IOS_TEAM_ID = "3V2UU7RRK9";
process.env.AGENT_DEVICE_IOS_BUNDLE_ID = "com.ramimaalouf.openmulticam.e2e.runner";
const appPath = resolve(".artifacts/hardware-build/Build/Products/Release-iphoneos/OpenMulticamE2E.app");
const identifier = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", join(appPath, "Info.plist")], { encoding: "utf8" }).trim();
if (identifier !== "com.ramimaalouf.openmulticam.e2e") throw new Error("refusing to install a production bundle on the physical phone");
export default {
  targets: [{ name: "iphone", engine: mobile({ platform: "ios", device, session: "openmulticam-hardware" }), app: { bundleId: identifier, appPath } }],
  tests: ["e2e/hardware/**/*.e2e.ts"], workers: 1, retries: 0, timeout: 180_000, launchTimeout: 180_000,
  output: ".artifacts/e2e-hardware", reporters: ["list", "markdown", "junit"],
} satisfies E2EConfig;
