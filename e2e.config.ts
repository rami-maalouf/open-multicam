import { resolve } from "node:path";
import { requireOwnedSimulator } from "./e2e/mobile/simulator-ownership";
import { mobile } from "@e2e-dev/mobile";
import type { E2EConfig } from "e2e";

process.env.AGENT_DEVICE_STATE_DIR = resolve(".artifacts/agent-device");

const device = requireOwnedSimulator();

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
