export type WorkloadResult = {
  name: string;
  unit: "ms/batch";
  samples: number[];
  checksum: string;
};

export type BenchmarkReport = {
  schema: 1;
  recordedAt: string;
  revision: string;
  sourceHash: string;
  dependencies: { expo: string; reactNative: string };
  compatibility: {
    harnessHash: string; fixtureHash: string; platform: string; arch: string;
    os: string; cpu: string; cpuCount: number; runtime: string; swift: string;
    build: string; warmups: number; repetitions: number; iterations: number;
    locale: string; timezone: string;
  };
  workloads: WorkloadResult[];
};

export function summarize(samples: number[]) {
  if (samples.length === 0 || samples.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("samples must be finite positive durations");
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    median: sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1]!,
    min: sorted[0]!, max: sorted[sorted.length - 1]!,
  };
}

export function compareReports(before: BenchmarkReport, after: BenchmarkReport) {
  if (before.schema !== 1 || after.schema !== 1) throw new Error("unsupported report schema");
  const textKeys = ["harnessHash", "fixtureHash", "platform", "arch", "os", "cpu", "runtime", "swift", "build", "locale", "timezone"] as const;
  const numberKeys = ["cpuCount", "warmups", "repetitions", "iterations"] as const;
  for (const report of [before, after]) {
    for (const key of textKeys) {
      if (typeof report.compatibility[key] !== "string" || !report.compatibility[key]) throw new Error(`incompatible or missing ${key}`);
    }
    for (const key of numberKeys) {
      const value = report.compatibility[key];
      if (!Number.isSafeInteger(value) || value < (key === "warmups" ? 0 : key === "repetitions" ? 3 : 1)) throw new Error(`incompatible or invalid ${key}`);
    }
  }
  for (const key of [...textKeys, ...numberKeys]) {
    if (before.compatibility[key] !== after.compatibility[key]) {
      throw new Error(`incompatible ${key}: rerun both revisions with identical benchmark conditions`);
    }
  }
  const names = before.workloads.map(({ name }) => name);
  if (names.length === 0 || new Set(names).size !== names.length ||
      after.workloads.length !== names.length || new Set(after.workloads.map(({ name }) => name)).size !== names.length) {
    throw new Error("workload sets differ or contain duplicates");
  }
  return before.workloads.map((baseline) => {
    const candidate = after.workloads.find(({ name }) => name === baseline.name);
    if (!candidate || baseline.unit !== "ms/batch" || candidate.unit !== baseline.unit) {
      throw new Error(`workload missing or incompatible unit: ${baseline.name}`);
    }
    if (baseline.checksum !== candidate.checksum || !baseline.checksum) {
      throw new Error(`correctness result changed: ${baseline.name}`);
    }
    if (baseline.samples.length !== before.compatibility.repetitions || candidate.samples.length !== after.compatibility.repetitions) {
      throw new Error(`incomplete samples: ${baseline.name}`);
    }
    const base = summarize(baseline.samples);
    const head = summarize(candidate.samples);
    return { name: baseline.name, unit: baseline.unit, before: base, after: head,
      medianChangePercent: (head.median / base.median - 1) * 100,
      p95ChangePercent: (head.p95 / base.p95 - 1) * 100 };
  });
}
