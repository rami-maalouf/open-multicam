import { spawnSync } from "node:child_process";

const argumentsAfterScript = process.argv.slice(2);
const scenarioFlagIndex = argumentsAfterScript.indexOf("--scenario");
const scenario = argumentsAfterScript[scenarioFlagIndex + 1];

if (scenarioFlagIndex === -1 || scenario === undefined) {
  console.error(
    "a simulator scenario is required, for example: --scenario foundation-preview",
  );
  process.exitCode = 1;
} else if (scenario !== "foundation-preview") {
  console.error(
    `simulator scenario "${scenario}" is unavailable; implemented scenarios: foundation-preview`,
  );
  process.exitCode = 1;
} else {
  const result = spawnSync(
    "bun",
    [
      "run",
      "test",
      "--",
      "--runTestsByPath",
      "e2e/simulator/foundation-preview.test.ts",
    ],
    {
      env: {
        ...process.env,
        OPENMULTICAM_E2E_SCENARIO: scenario,
      },
      stdio: "inherit",
    },
  );

  if (result.error !== undefined) {
    console.error(`unable to start simulator scenario: ${result.error.message}`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
