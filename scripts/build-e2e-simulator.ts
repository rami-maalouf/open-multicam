import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runtimeDigest } from "../e2e/mobile/build-identity";
import { requireOwnedSimulator } from "../e2e/mobile/simulator-ownership";

const udid = requireOwnedSimulator();
const buildDirectory = resolve(process.env.OPENMULTICAM_E2E_BUILD_DIR ?? ".artifacts/native-build");
if (!buildDirectory.startsWith(resolve(".artifacts") + "/")) throw new Error("build output must stay inside task-owned .artifacts");
const result = spawnSync("xcodebuild", ["-workspace", "ios/OpenMulticam.xcworkspace", "-scheme", "OpenMulticam", "-configuration", "Release", "-sdk", "iphonesimulator", "-destination", `platform=iOS Simulator,id=${udid}`, "-derivedDataPath", buildDirectory, "CODE_SIGNING_ALLOWED=NO", `ARCHS=${process.arch === "arm64" ? "arm64" : "x86_64"}`, "ONLY_ACTIVE_ARCH=YES", "GCC_GENERATE_DEBUGGING_SYMBOLS=NO", "DEBUG_INFORMATION_FORMAT=dwarf", "SWIFT_SERIALIZE_DEBUGGING_OPTIONS=NO", "-jobs", "2"], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
const appPath = join(buildDirectory, "Build/Products/Release-iphonesimulator/OpenMulticam.app");
writeFileSync(join(appPath, "e2e-build.json"), JSON.stringify({
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runtimeDigest: runtimeDigest(),
  bundleDigest: createHash("sha256").update(readFileSync(join(appPath, "main.jsbundle"))).digest("hex"),
  builtAt: new Date().toISOString(),
}, null, 2));
