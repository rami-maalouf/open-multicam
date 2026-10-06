import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runtimeDigest } from "../e2e/mobile/build-identity";

const device = process.env.OPENMULTICAM_E2E_DEVICE_UDID;
if (!device) throw new Error("select the explicitly approved paired iPhone UDID in OPENMULTICAM_E2E_DEVICE_UDID");
const preparation = spawnSync("bun", ["scripts/prepare-e2e-hardware.ts"], { stdio: "inherit" });
if (preparation.status !== 0) process.exit(preparation.status ?? 1);
const source = resolve(".artifacts/hardware-source");
const config = JSON.parse(readFileSync(join(source, "app.json"), "utf8"));
if (config.expo.ios.bundleIdentifier !== "com.ramimaalouf.openmulticam.e2e") throw new Error("refusing a production hardware build");
for (const [command, args, cwd] of [
  ["pod", ["install"], join(source, "ios")],
  ["xcodebuild", ["-workspace", "ios/OpenMulticamE2E.xcworkspace", "-scheme", "OpenMulticamE2E", "-configuration", "Release", "-sdk", "iphoneos", "-destination", "generic/platform=iOS", "-derivedDataPath", resolve(".artifacts/hardware-build"), "DEVELOPMENT_TEAM=3V2UU7RRK9", "CODE_SIGN_STYLE=Automatic", "-allowProvisioningUpdates", "ARCHS=arm64", "ONLY_ACTIVE_ARCH=YES", "GCC_GENERATE_DEBUGGING_SYMBOLS=NO", "DEBUG_INFORMATION_FORMAT=dwarf", "SWIFT_SERIALIZE_DEBUGGING_OPTIONS=NO", "-jobs", "2"], source],
] as const) {
  const result = spawnSync(command, [...args], { cwd, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const appPath = resolve(".artifacts/hardware-build/Build/Products/Release-iphoneos/OpenMulticamE2E.app");
const identifier = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", join(appPath, "Info.plist")], { encoding: "utf8" }).trim();
if (identifier !== "com.ramimaalouf.openmulticam.e2e") throw new Error("built hardware identity differs from the isolated identity");
writeFileSync(join(appPath, "e2e-build.json"), JSON.stringify({ commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), runtimeDigest: runtimeDigest(), bundleDigest: createHash("sha256").update(readFileSync(join(appPath, "main.jsbundle"))).digest("hex"), builtAt: new Date().toISOString(), bundleId: identifier, deviceUdid: device }, null, 2));
console.log(`signed isolated hardware artifact prepared at ${appPath}; no phone was installed or recorded`);
