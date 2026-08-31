import { spawn } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const packageManifest = `// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "MulticamCaptureBoundary",
  platforms: [.iOS("18.6")],
  products: [
    .library(
      name: "MulticamCaptureBoundary",
      targets: ["MulticamCaptureBoundary"]
    )
  ],
  targets: [
    .target(name: "MulticamCaptureBoundary"),
    .testTarget(
      name: "MulticamCaptureBoundaryTests",
      dependencies: ["MulticamCaptureBoundary"]
    )
  ]
)
`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const captureOutput = options.stdio === undefined;
    const child = spawn(command, args, {
      ...options,
      stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, options.timeoutMs)
      : undefined;

    if (captureOutput) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk;
      });
    }
    child.on("error", reject);
    child.on("close", (status) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve({ status, stdout, stderr, timedOut });
    });
  });
}

async function simulatorUdid() {
  const requestedUdid = process.env.OPENMULTICAM_SIMULATOR_UDID;

  if (requestedUdid) {
    return requestedUdid;
  }

  const [devicesResult, sdkResult] = await Promise.all([
    run("xcrun", [
      "simctl",
      "list",
      "devices",
      "available",
      "--json",
    ]),
    run("xcrun", ["--sdk", "iphonesimulator", "--show-sdk-version"]),
  ]);

  if (devicesResult.status !== 0) {
    throw new Error(devicesResult.stderr || "unable to list iOS simulators");
  }

  if (sdkResult.status !== 0) {
    throw new Error(sdkResult.stderr || "unable to read the iOS simulator SDK");
  }

  const maximumRuntime = sdkResult.stdout.trim().split(".").map(Number);
  const runtimes = Object.entries(JSON.parse(devicesResult.stdout).devices);
  const iphones = runtimes.flatMap(([runtimeIdentifier, devices]) => {
    const match = runtimeIdentifier.match(/iOS-(\d+)-(\d+)$/);
    const runtime = match ? [Number(match[1]), Number(match[2])] : undefined;

    return devices
      .filter((device) => device.name.startsWith("iPhone"))
      .map((device) => ({ ...device, runtime }));
  });
  const compatibleIphones = iphones.filter((device) => {
    if (!device.runtime) {
      return false;
    }

    const [major, minor] = device.runtime;
    const [maximumMajor, maximumMinor] = maximumRuntime;

    return (
      major < maximumMajor ||
      (major === maximumMajor && minor <= maximumMinor)
    );
  });
  const simulator =
    compatibleIphones.find((device) => device.state === "Booted") ??
    compatibleIphones[0];

  if (!simulator) {
    throw new Error("no iPhone simulator compatible with this Xcode SDK was found");
  }

  return simulator.udid;
}

async function createTestPackage(packageRoot) {
  const sourceRoot = join(packageRoot, "Sources", "MulticamCaptureBoundary");
  const testRoot = join(
    packageRoot,
    "Tests",
    "MulticamCaptureBoundaryTests",
  );
  const nativeRoot = "modules/multicam-capture/ios";
  const repositoryTests = join(nativeRoot, "Tests");

  await mkdir(sourceRoot, { recursive: true });
  await mkdir(testRoot, { recursive: true });
  await writeFile(join(packageRoot, "Package.swift"), packageManifest);
  const sourceFiles = [
    "CaptureBoundary.swift",
    "CaptureModels.swift",
    "CaptureStateMachine.swift",
  ];
  await Promise.all(
    sourceFiles.map((fileName) =>
      copyFile(join(nativeRoot, fileName), join(sourceRoot, fileName)),
    ),
  );

  const testFiles = (await readdir(repositoryTests)).filter((fileName) =>
    fileName.endsWith("Tests.swift"),
  );

  if (testFiles.length === 0) {
    throw new Error("no native XCTest files were found");
  }

  await Promise.all(
    testFiles.map((fileName) =>
      copyFile(join(repositoryTests, fileName), join(testRoot, basename(fileName))),
    ),
  );
}

async function findFile(directory, fileName) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      const nested = await findFile(entryPath, fileName);

      if (nested) {
        return nested;
      }
    } else if (entry.name === fileName) {
      return entryPath;
    }
  }

  return undefined;
}

async function enforceStateMachineCoverage(packageRoot) {
  const derivedData = join(packageRoot, "DerivedData");
  const profile = await findFile(
    join(derivedData, "Build", "ProfileData"),
    "Coverage.profdata",
  );
  const executable = join(
    derivedData,
    "Build",
    "Products",
    "Debug-iphonesimulator",
    "MulticamCaptureBoundaryTests.xctest",
    "MulticamCaptureBoundaryTests",
  );
  const source = join(
    packageRoot,
    "Sources",
    "MulticamCaptureBoundary",
    "CaptureStateMachine.swift",
  );

  if (!profile) {
    throw new Error("native coverage profile was not generated");
  }

  const result = await run("xcrun", [
    "llvm-cov",
    "export",
    executable,
    `-instr-profile=${profile}`,
    "--summary-only",
    "--sources",
    source,
  ]);

  if (result.status !== 0) {
    throw new Error(result.stderr || "unable to read native coverage");
  }

  const report = JSON.parse(result.stdout);
  const file = report.data[0]?.files?.find((item) =>
    item.filename.endsWith("CaptureStateMachine.swift"),
  );
  const branches = file?.summary?.branches;
  const regions = file?.summary?.regions;
  const lines = file?.summary?.lines;

  if (!branches || !regions || !lines) {
    throw new Error("state-machine coverage was missing from the native report");
  }

  console.log(
    `native state machine coverage: ${regions.percent}% regions, ${lines.percent}% lines`,
  );

  if (branches.count > 0 && branches.percent < 100) {
    throw new Error(
      `native state-machine branch coverage is ${branches.percent}%`,
    );
  }

  if (regions.percent < 100 || lines.percent < 100) {
    const details = await run("xcrun", [
      "llvm-cov",
      "show",
      executable,
      `-instr-profile=${profile}`,
      "--show-line-counts-or-regions",
      source,
    ]);
    throw new Error(
      `native state-machine coverage is ${regions.percent}% regions and ${lines.percent}% lines\n${details.stdout}`,
    );
  }
}

async function main() {
  const packageRoot = await mkdtemp(join(tmpdir(), "openmulticam-native-tests-"));

  try {
    await createTestPackage(packageRoot);
    const udid = await simulatorUdid();
    const result = await run(
      "xcodebuild",
      [
        "test",
        "-quiet",
        "-scheme",
        "MulticamCaptureBoundary",
        "-destination",
        `platform=iOS Simulator,id=${udid}`,
        "-derivedDataPath",
        join(packageRoot, "DerivedData"),
        "-enableCodeCoverage",
        "YES",
        "-parallel-testing-enabled",
        "NO",
        "CODE_SIGNING_ALLOWED=NO",
      ],
      { cwd: packageRoot, stdio: "inherit", timeoutMs: 60_000 },
    );

    if (result.timedOut) {
      console.error("native XCTest suite exceeded the 60 second limit");
    }

    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      return;
    }

    await enforceStateMachineCoverage(packageRoot);
    console.log("native XCTest suite passed");
  } finally {
    await rm(packageRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
