import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { mobile } from "@e2e-dev/mobile";
import type { E2EConfig } from "e2e";

process.env.AGENT_DEVICE_STATE_DIR = resolve(".artifacts/agent-device");

const device = process.env.OPENMULTICAM_SIMULATOR_UDID;
if (!device) throw new Error("set OPENMULTICAM_SIMULATOR_UDID to an isolated OpenMulticam-TesterArmy simulator");
const inventory = JSON.parse(execFileSync("xcrun", ["simctl", "list", "devices", "available", "--json"], { encoding: "utf8" }));
const devices = Object.values(inventory.devices).flat() as { udid: string; name: string }[];
if (!devices.some((entry) => entry.udid === device && entry.name.startsWith("OpenMulticam-TesterArmy"))) {
  throw new Error("refusing to boot or install on a personal simulator; create an isolated OpenMulticam-TesterArmy simulator");
}

export default {
  targets: [{
    name: "ios",
    engine: mobile({ platform: "ios", device, session: "openmulticam-tester-army", settle: 300 }),
    app: {
      bundleId: "com.ramimaalouf.openmulticam",
      appPath: process.env.OPENMULTICAM_E2E_APP_PATH ?? ".artifacts/native-build/Build/Products/Release-iphonesimulator/OpenMulticam.app",
      permissions: { camera: "grant", microphone: "grant" },
    },
  }],
  tests: ["e2e/mobile/**/*.e2e.ts"],
  workers: 1,
  retries: 0,
  timeout: 120_000,
  launchTimeout: 120_000,
  assertionTimeout: 15_000,
  output: ".artifacts/e2e",
  reporters: ["list", "junit", "markdown"],
} satisfies E2EConfig;
