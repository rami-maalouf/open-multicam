import { compareReports, summarize, type BenchmarkReport } from "../scripts/benchmark-report";

function report(samples: number[]): BenchmarkReport {
  return {
    schema: 1,
    recordedAt: "2026-10-30T00:00:00.000Z",
    revision: "baseline",
    sourceHash: "source",
    dependencies: { expo: "57", reactNative: "0.86" },
    compatibility: {
      harnessHash: "harness", fixtureHash: "fixture", platform: "darwin", arch: "arm64",
      os: "test", cpu: "test-cpu", cpuCount: 8, runtime: "bun-test", swift: "swift-test",
      build: "bun-host-and-swift-O", warmups: 2, repetitions: 3, iterations: 10,
      locale: "en-US", timezone: "UTC",
    },
    workloads: [{ name: "manifest-decode", unit: "ms/batch", samples, checksum: "30" }],
  };
}

describe("benchmark comparison evidence", () => {
  it("computes the median and nearest-rank p95 from raw samples", () => {
    expect(summarize([30, 10, 20, 40])).toEqual({ median: 25, p95: 40, min: 10, max: 40 });
  });

  it("compares different app revisions while preserving exact workload conditions", () => {
    const before = report([10, 20, 30]);
    const after = { ...report([20, 30, 40]), revision: "candidate", sourceHash: "changed" };
    expect(compareReports(before, after)[0]).toMatchObject({ name: "manifest-decode", medianChangePercent: 50 });
  });

  it.each(["fixtureHash", "harnessHash", "runtime", "cpu", "iterations", "warmups", "repetitions"] as const)(
    "refuses mismatched %s instead of producing a misleading speedup", (field) => {
      const after = report([1, 2, 3]);
      after.compatibility = { ...after.compatibility, [field]: "different" } as BenchmarkReport["compatibility"];
      expect(() => compareReports(report([10, 20, 30]), after)).toThrow("incompatible");
    },
  );

  it("refuses a faster candidate whose results differ", () => {
    const after = report([1, 2, 3]);
    after.workloads[0]!.checksum = "wrong";
    expect(() => compareReports(report([10, 20, 30]), after)).toThrow("correctness");
  });

  it.each(["iterations", "warmups", "repetitions"] as const)(
    "refuses valid but different %s", (field) => {
      const before = report([10, 20, 30]);
      const after = report([1, 2, 3]);
      after.compatibility[field] += 1;
      if (field === "repetitions") after.workloads[0]!.samples.push(4);
      expect(() => compareReports(before, after)).toThrow(`incompatible ${field}: rerun`);
    },
  );

  it("refuses duplicate workload names", () => {
    const before = report([10, 20, 30]);
    const after = report([1, 2, 3]);
    before.workloads.push({ ...before.workloads[0]!, name: "second-workload" });
    after.workloads.push({ ...after.workloads[0]! });
    expect(() => compareReports(before, after)).toThrow("contain duplicates");
  });

  it("refuses a same-sized different workload set", () => {
    const after = report([1, 2, 3]);
    after.workloads[0]!.name = "different-workload";
    expect(() => compareReports(report([10, 20, 30]), after)).toThrow("workload missing");
  });

  it("refuses a missing workload", () => {
    const after = report([1, 2, 3]);
    after.workloads = [];
    expect(() => compareReports(report([10, 20, 30]), after)).toThrow("workload");
  });

  it("refuses reports without benchmark provenance", () => {
    const missing = report([1, 2, 3]);
    Reflect.deleteProperty(missing.compatibility, "fixtureHash");
    expect(() => compareReports(missing, missing)).toThrow();
  });

  it.each([[], [1, 2], [1, Number.NaN, 3], [1, 0, 3], [1, -1, 3]])(
    "refuses incomplete or invalid raw samples %j", (...samples) => {
      expect(() => compareReports(report([10, 20, 30]), report(samples))).toThrow();
    },
  );
});
