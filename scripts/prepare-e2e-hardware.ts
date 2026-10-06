import { cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const destination = resolve(".artifacts/hardware-source");
mkdirSync(destination, { recursive: true });
for (const path of ["src", "modules", "assets", "package.json", "bun.lock", "tsconfig.json", "babel.config.js", "metro.config.js"]) {
  const target = join(destination, path);
  if (existsSync(target)) rmSync(target, { recursive: true });
  if (existsSync(path)) cpSync(path, target, { recursive: true });
}
cpSync("e2e/hardware/metro.config.cjs", join(destination, "metro.config.js"));
if (!existsSync(join(destination, "node_modules"))) symlinkSync(resolve("node_modules"), join(destination, "node_modules"), "dir");
const config = JSON.parse(readFileSync("app.json", "utf8"));
config.expo.name = "OpenMulticam E2E";
config.expo.scheme = "openmulticam-e2e";
config.expo.ios.bundleIdentifier = "com.ramimaalouf.openmulticam.e2e";
config.expo.ios.appleTeamId = "3V2UU7RRK9";
config.expo.extra = { router: {} };
writeFileSync(join(destination, "app.json"), JSON.stringify(config, null, 2));
const result = spawnSync("bunx", ["--no-install", "expo", "prebuild", "--platform", "ios", "--no-install"], { cwd: destination, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`isolated hardware source prepared at ${destination}; run pod install there, then the documented signing build; no phone was installed or recorded`);
