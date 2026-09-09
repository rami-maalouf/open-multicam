import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// storekit requires an installed app host; a hostless swift package cannot load products.
const project = `name: TipJarTests
options:
  deploymentTarget:
    iOS: "18.6"
settings:
  base:
    SWIFT_VERSION: "5.0"
    GENERATE_INFOPLIST_FILE: YES
    CODE_SIGN_IDENTITY: "-"
    ENABLE_USER_SCRIPT_SANDBOXING: YES
targets:
  TipJarTestHost:
    type: application
    platform: iOS
    sources: [Host]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.ramimaalouf.openmulticam.storekit-tests
        INFOPLIST_KEY_UILaunchScreen_Generation: YES
        INFOPLIST_KEY_UIApplicationSceneManifest_Generation: YES
  TipJarStoreTests:
    type: bundle.unit-test
    platform: iOS
    sources: [Tests]
    dependencies:
      - target: TipJarTestHost
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.ramimaalouf.openmulticam.storekit-tests.unit
schemes:
  TipJarTests:
    build:
      targets:
        TipJarTestHost: all
    test:
      targets: [TipJarStoreTests]
      gatherCoverageData: true
`;

const host = `import SwiftUI

@main
struct TipJarTestHost: App {
  var body: some Scene {
    WindowGroup { Text("OpenMulticam StoreKit tests") }
  }
}
`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message ?? result.stderr ?? `${command} failed`);
  }
  return result.stdout;
}

const root = await mkdtemp(join(tmpdir(), "openmulticam-storekit-tests-"));
try {
  await mkdir(join(root, "Host"));
  await cp("modules/tip-jar/ios/Tests", join(root, "Tests"), { recursive: true });
  await cp("modules/tip-jar/ios/TipJarStore.swift", join(root, "Host/TipJarStore.swift"));
  await writeFile(join(root, "Host/App.swift"), host);
  await writeFile(join(root, "project.yml"), project);
  run("xcodegen", ["generate", "--spec", join(root, "project.yml")]);
  const devices = JSON.parse(run("xcrun", ["simctl", "list", "devices", "available", "--json"]));
  // ios 26.5 has a storekit cli regression (apple feedback fb22237318).
  const compatible = (devices.devices["com.apple.CoreSimulator.SimRuntime.iOS-26-1"] ?? [])
    .filter((item) => item.name.startsWith("iPhone"));
  const device = compatible.find((item) => item.state === "Booted") ?? compatible[0];
  const udid = process.env.OPENMULTICAM_SIMULATOR_UDID ?? device?.udid;
  if (!udid) throw new Error("create an iOS 26.1 iPhone simulator, or set OPENMULTICAM_SIMULATOR_UDID to a runtime with working StoreKit testing");
  try {
    run("xcodebuild", [
      "test", "-project", join(root, "TipJarTests.xcodeproj"), "-scheme", "TipJarTests",
      "-destination", `platform=iOS Simulator,id=${udid}`,
      "-derivedDataPath", join(root, "DerivedData"), "-resultBundlePath", join(root, "Results.xcresult"),
      "-parallel-testing-enabled", "NO", "-test-timeouts-enabled", "YES",
      "-default-test-execution-time-allowance", "30", "-maximum-test-execution-time-allowance", "30",
    ], { stdio: "inherit", timeout: 180_000, killSignal: "SIGKILL" });
  } finally {
    const summary = run("xcrun", ["xcresulttool", "get", "test-results", "summary", "--path", join(root, "Results.xcresult")]);
    console.log(summary);
  }
  console.log("native StoreKit purchase, restoration, approval, and refund tests passed");
} finally {
  await rm(root, { recursive: true, force: true });
}
