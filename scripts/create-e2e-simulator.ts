import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { simulatorAppIntent } from "../e2e/mobile/simulator-ownership";

const inventory = JSON.parse(execFileSync("xcrun", ["simctl", "list", "--json"], { encoding: "utf8" }));
const runtime = inventory.runtimes.filter((entry: { identifier: string; isAvailable: boolean }) => entry.isAvailable && entry.identifier.includes("SimRuntime.iOS"))
  .sort((a: { version: string }, b: { version: string }) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
const type = inventory.devicetypes.find((entry: { name: string }) => entry.name === "iPhone 17 Pro")
  ?? inventory.devicetypes.toReversed().find((entry: { name: string }) => entry.name.startsWith("iPhone"));
if (!runtime || !type) throw new Error("install an iOS simulator runtime and iPhone device type in Xcode first");
const creationToken = randomUUID();
const name = `OpenMulticam-TesterArmy-${creationToken}`;
const id = execFileSync("xcrun", ["simctl", "create", name, type.identifier, runtime.identifier], { encoding: "utf8" }).trim();
const directory = resolve(".artifacts/simulator-ownership");
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, `${id}.json`), JSON.stringify({ version: 1, udid: id, name, creationToken,
  createdBy: "scripts/create-e2e-simulator.ts", createdAt: new Date().toISOString(),
  project: realpathSync("."), appIntent: simulatorAppIntent, runtime: runtime.identifier, deviceType: type.identifier,
}, null, 2), { flag: "wx" });
console.log(id);
