import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const forbiddenPathPatterns = [
  /^\.env(?:\.|$)/,
  /^\.expo(?:\/|$)/,
  /^\.artifacts(?:\/|$)/,
  /^coverage(?:\/|$)/,
  /^dist-validation(?:\/|$)/,
  /^ios(?:\/|$)/,
  /^android(?:\/|$)/,
  /^node_modules(?:\/|$)/,
  /(?:^|\/)(?:recordings|staging|exports)(?:\/|$)/,
  /\.(?:caf|jks|key|m4a|mobileprovision|mov|mp4|p12|p8|pem)$/i,
];

const forbiddenIdentityPattern =
  /habittracker|habit-tracker|ripples|1e477943-ecf0-4d66-8967-c77e0ec0019c|com\.ramimaalouf\.habittracker|iCloud\.com\.ramimaalouf\.habittracker/i;

const secretPattern =
  /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----|(?:EXPO_TOKEN|OPENAI_API_KEY)\s*=\s*[^\s]+/;

function listRepositoryCandidates() {
  const result = spawnSync(
    "git",
    ["ls-files", "-co", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || "unable to list repository files");
  }

  return result.stdout.split("\0").filter(Boolean);
}

function pathViolation(filePath) {
  return forbiddenPathPatterns.some((pattern) => pattern.test(filePath));
}

function textContent(filePath) {
  const content = readFileSync(filePath);

  if (content.subarray(0, 8192).includes(0)) {
    return null;
  }

  return content.toString("utf8");
}

function validateFiles(filePaths) {
  const violations = [];

  for (const filePath of filePaths) {
    if (pathViolation(filePath)) {
      violations.push(`${filePath}: forbidden repository path`);
      continue;
    }

    if (!existsSync(filePath)) {
      continue;
    }

    const content = textContent(filePath);

    if (content === null) {
      continue;
    }

    if (secretPattern.test(content)) {
      violations.push(`${filePath}: possible committed secret`);
    }

    if (/^(?:app\.json|eas\.json|package\.json|src\/|modules\/)/.test(filePath) && forbiddenIdentityPattern.test(content)) {
      violations.push(`${filePath}: forbidden starter identity`);
    }
  }

  return violations;
}

function report(violations) {
  if (violations.length === 0) {
    console.log("repository boundary check passed");
    return;
  }

  for (const violation of violations) {
    console.error(violation);
  }

  process.exitCode = 1;
}

const [command, value] = process.argv.slice(2);

if (command === "--probe") {
  report(validateFiles([value ?? ""]));
} else if (command === "--native-tests") {
  if (!existsSync("modules/multicam-capture/ios/Tests")) {
    console.error("native tests are unavailable until the local capture module exists");
    process.exitCode = 1;
  } else {
    const result = spawnSync("bun", ["scripts/run-native-tests.mjs"], {
      stdio: "inherit",
    });
    process.exitCode = result.status ?? 1;
  }
} else if (command !== undefined) {
  console.error(`unknown repository-check command: ${command}`);
  process.exitCode = 1;
} else {
  report(validateFiles(listRepositoryCandidates()));
}
