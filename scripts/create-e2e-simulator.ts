import { execFileSync } from "node:child_process";

const inventory = JSON.parse(execFileSync("xcrun", ["simctl", "list", "--json"], { encoding: "utf8" }));
const runtime = inventory.runtimes.filter((entry: { identifier: string; isAvailable: boolean }) => entry.isAvailable && entry.identifier.includes("SimRuntime.iOS"))
  .sort((a: { version: string }, b: { version: string }) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
const type = inventory.devicetypes.find((entry: { name: string }) => entry.name === "iPhone 17 Pro")
  ?? inventory.devicetypes.toReversed().find((entry: { name: string }) => entry.name.startsWith("iPhone"));
if (!runtime || !type) throw new Error("install an iOS simulator runtime and iPhone device type in Xcode first");
const id = execFileSync("xcrun", ["simctl", "create", `OpenMulticam-TesterArmy-${Date.now()}`, type.identifier, runtime.identifier], { encoding: "utf8" }).trim();
console.log(id);
