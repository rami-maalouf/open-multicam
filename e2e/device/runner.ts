const argumentsAfterScript = process.argv.slice(2);
const scenarioFlagIndex = argumentsAfterScript.indexOf("--scenario");
const scenario = argumentsAfterScript[scenarioFlagIndex + 1];

if (scenarioFlagIndex === -1 || scenario === undefined) {
  console.error(
    "a physical-device scenario is required, for example: --scenario first-recording",
  );
} else {
  console.error(
    `physical-device scenario "${scenario}" is unavailable until the signed device harness exists`,
  );
}

process.exitCode = 1;
