import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export function runtimeDigest() {
  const hash = createHash("sha256");
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  hash.update(JSON.stringify({ main: manifest.main, dependencies: manifest.dependencies }));
  const files: string[] = ["bun.lock", "app.json"];
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else files.push(path);
    }
  }
  visit("src");
  visit("modules");
  for (const file of files) hash.update(file).update(readFileSync(file));
  return hash.digest("hex");
}

export function verifyBuild() {
  const appPath = resolve(process.env.OPENMULTICAM_E2E_APP_PATH ?? ".artifacts/native-build/Build/Products/Release-iphonesimulator/OpenMulticam.app");
  const id = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", join(appPath, "Info.plist")], { encoding: "utf8" }).trim();
  if (id !== "com.ramimaalouf.openmulticam") throw new Error(`refusing wrong app bundle: ${id}`);
  const receipt = join(appPath, "e2e-build.json");
  if (!existsSync(receipt)) throw new Error("build provenance missing: run bun run build:e2e:sim");
  const identity = JSON.parse(readFileSync(receipt, "utf8"));
  if (identity.runtimeDigest !== runtimeDigest()) throw new Error("stale app: runtime source changed since build");
  const bundleDigest = createHash("sha256").update(readFileSync(join(appPath, "main.jsbundle"))).digest("hex");
  if (identity.bundleDigest !== bundleDigest) throw new Error("stale app: bundled JavaScript differs from build receipt");
}
