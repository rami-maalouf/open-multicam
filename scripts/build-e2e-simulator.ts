import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runtimeDigest } from "../e2e/mobile/build-identity";

const udid = process.env.OPENMULTICAM_SIMULATOR_UDID;
if (!udid) throw new Error("set OPENMULTICAM_SIMULATOR_UDID to the isolated simulator");
const result = spawnSync("xcodebuild", ["-workspace", "ios/OpenMulticam.xcworkspace", "-scheme", "OpenMulticam", "-configuration", "Release", "-sdk", "iphonesimulator", "-destination", `platform=iOS Simulator,id=${udid}`, "-derivedDataPath", ".artifacts/native-build", "CODE_SIGNING_ALLOWED=NO", "ARCHS=arm64", "ONLY_ACTIVE_ARCH=YES"], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
const appPath = ".artifacts/native-build/Build/Products/Release-iphonesimulator/OpenMulticam.app";
writeFileSync(join(appPath, "e2e-build.json"), JSON.stringify({
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runtimeDigest: runtimeDigest(),
  bundleDigest: createHash("sha256").update(readFileSync(join(appPath, "main.jsbundle"))).digest("hex"),
  builtAt: new Date().toISOString(),
}, null, 2));
