import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { arch, cpus, platform, release, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { compareReports, summarize } from "./benchmark-report.ts";
import { createWorkloads } from "./benchmark-workloads.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const command = process.argv[2];
const { values, positionals } = parseArgs({ args: process.argv.slice(3), allowPositionals: true,
  options: { out: { type: "string" }, iterations: { type: "string", default: "10000" },
    warmups: { type: "string", default: "2" }, repetitions: { type: "string", default: "7" } } });
const hash = (value) => createHash("sha256").update(value).digest("hex");
const hashFiles = (paths) => hash(paths.map((path) => `${path}\0${readFileSync(path, "utf8")}`).join("\0"));
const run = (program, args) => execFileSync(program, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }).trim();
function integer(value, minimum) {
  const result = Number(value);
  assert(Number.isSafeInteger(result) && result >= minimum, `expected integer >= ${minimum}, got ${value}`);
  return result;
}
function save(path, value) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

if (command === "compare") {
  assert.equal(positionals.length, 2, "compare needs before.json and after.json");
  const before = JSON.parse(readFileSync(positionals[0], "utf8"));
  const after = JSON.parse(readFileSync(positionals[1], "utf8"));
  const comparison = { before: before.revision, after: after.revision,
    note: "descriptive host microbenchmark differences; not a speedup or device-performance claim",
    workloads: compareReports(before, after) };
  if (values.out) save(values.out, comparison);
  console.log(JSON.stringify(comparison, null, 2));
} else if (command === "run") {
  assert(values.out, "run requires --out report.json; existing reports are never overwritten");
  assert(!existsSync(values.out), `output already exists: ${values.out}; choose a new report path`);
  assert.equal(positionals.length, 0, "unexpected positional argument");
  assert.equal(platform(), "darwin", "native host benchmarks require macOS and Xcode command-line tools");
  const iterations = integer(values.iterations, 1);
  const warmups = integer(values.warmups, 0);
  const repetitions = integer(values.repetitions, 3);
  const { fixtures, workloads } = createWorkloads(iterations);
  const results = [];
  for (const workload of workloads) {
    const expected = workload.measure().checksum;
    for (let i = 0; i < warmups; i++) assert.equal(workload.measure().checksum, expected);
    const samples = [];
    for (let i = 0; i < repetitions; i++) {
      const result = workload.measure();
      assert.equal(result.checksum, expected, `${workload.name} changed across repetitions`);
      samples.push(result.milliseconds);
    }
    results.push({ name: workload.name, unit: "ms/batch", samples, checksum: expected });
  }
  const swift = run("xcrun", ["swiftc", "--version"]);
  const nativeSources = ["CaptureModels.swift", "CaptureStateMachine.swift", "CapturePipLayout.swift"].map((name) => `modules/multicam-capture/ios/${name}`);
  const temporary = mkdtempSync(join(tmpdir(), "open-multicam-benchmark-"));
  try {
    const binary = join(temporary, "benchmark-native");
    run("xcrun", ["swiftc", "-O", ...nativeSources, "scripts/benchmark-native.swift", "-o", binary]);
    results.push(...JSON.parse(run(binary, [String(iterations), String(warmups), String(repetitions)])));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  const expoVersion = JSON.parse(readFileSync("node_modules/expo/package.json", "utf8")).version;
  const reactNativeVersion = JSON.parse(readFileSync("node_modules/react-native/package.json", "utf8")).version;
  const locale = new Intl.DateTimeFormat().resolvedOptions();
  const cpuInfo = cpus();
  const report = {
    schema: 1, recordedAt: new Date().toISOString(), revision: run("git", ["rev-parse", "HEAD"]),
    sourceHash: hashFiles([...nativeSources, "src/core/library/manifest.ts", "src/core/library/manifest-schema.ts", "src/core/library/entry.ts", "src/core/capture/selection.ts", "src/core/capture/types.ts", "src/core/results/result.ts"]),
    dependencies: { expo: expoVersion, reactNative: reactNativeVersion },
    compatibility: {
      harnessHash: hashFiles(["scripts/benchmark.mjs", "scripts/benchmark-report.ts", "scripts/benchmark-workloads.ts", "scripts/benchmark-native.swift"]),
      fixtureHash: hash(JSON.stringify(fixtures)), platform: platform(), arch: arch(), os: release(),
      cpu: cpuInfo[0]?.model ?? "unknown", cpuCount: cpuInfo.length,
      runtime: run("bun", ["--version"]), swift, build: "bun-host-and-swift-O",
      warmups, repetitions, iterations, locale: locale.locale, timezone: locale.timeZone,
    }, workloads: results,
  };
  compareReports(report, report);
  save(values.out, report);
  console.log(JSON.stringify({ path: values.out, workloads: results.map((result) => ({ name: result.name, ...summarize(result.samples) })) }, null, 2));
} else {
  throw new Error("usage: bun scripts/benchmark.mjs run --out report.json | compare before.json after.json [--out comparison.json]");
}
