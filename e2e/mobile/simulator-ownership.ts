import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

export const simulatorAppIntent = "com.ramimaalouf.openmulticam";

export function requireOwnedSimulator() {
  const udid = process.env.OPENMULTICAM_SIMULATOR_UDID;
  if (!udid) throw new Error("set OPENMULTICAM_SIMULATOR_UDID to a newly created test simulator");
  const receipt = JSON.parse(readFileSync(resolve(".artifacts/simulator-ownership", `${udid}.json`), "utf8"));
  let creationMatches = receipt.createdBy === "scripts/create-e2e-simulator.ts"
    && typeof receipt.creationToken === "string" && /^[0-9a-f-]{36}$/.test(receipt.creationToken)
    && receipt.name === `OpenMulticam-TesterArmy-${receipt.creationToken}`;
  if (receipt.createdBy === "original-task-creation-evidence") {
    const bytes = readFileSync(resolve(".artifacts/original-simulator-creation-evidence.json"));
    const evidence = JSON.parse(bytes.toString("utf8"));
    creationMatches = receipt.creationEvidenceDigest === createHash("sha256").update(bytes).digest("hex")
      && evidence.returnedUdid === udid && evidence.exitCode === 0
      && evidence.command === `xcrun simctl create ${receipt.name} ${receipt.deviceType} ${receipt.runtime}`;
  }
  if (receipt.version !== 1 || receipt.udid !== udid || receipt.appIntent !== simulatorAppIntent
    || receipt.project !== realpathSync(".") || !creationMatches) {
    throw new Error("simulator ownership receipt does not match this project, device and app intent");
  }
  const inventory = JSON.parse(execFileSync("xcrun", ["simctl", "list", "devices", "available", "--json"], { encoding: "utf8" }));
  const devices = inventory.devices[receipt.runtime] as { udid: string; name: string; deviceTypeIdentifier: string }[] | undefined;
  if (!devices?.some((entry) => entry.udid === udid && entry.name === receipt.name && entry.deviceTypeIdentifier === receipt.deviceType)) {
    throw new Error("created simulator no longer matches its ownership receipt");
  }
  return udid;
}
