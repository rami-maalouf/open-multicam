import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { decodeRecordingSetManifest } from "../src/core/library/manifest-schema";
import { formatRecordingDuration, recordingDisplayName, recordingDurationMs } from "../src/core/library/entry";
import { resolveSelection, selectCamera } from "../src/core/capture/selection";
import { recordingManifestFixtures, recordingOutcomeFixtures } from "../src/testing/recording-fixtures";
import type { SupportedCaptureConfiguration } from "../src/core/capture/types";

function workload<T>(name: string, run: () => T, verify: (result: T) => void) {
  return { name, measure() {
    const start = performance.now();
    const result = run();
    const milliseconds = performance.now() - start;
    verify(result);
    return { milliseconds, checksum: createHash("sha256").update(JSON.stringify(result)).digest("hex") };
  } };
}

export function createWorkloads(iterations: number) {
  const fixtures = [...Object.values(recordingManifestFixtures), ...Object.values(recordingOutcomeFixtures)];
  const manifests = Array.from({ length: iterations }, (_, index) => ({
    ...fixtures[index % fixtures.length]!, recordingSetId: `benchmark-${index}`,
  }));
  const encoded = manifests.map((manifest) => JSON.stringify(manifest));
  const entries = manifests.map((manifest, index) => ({ ...manifest,
    name: index % 2 === 0 ? `take ${index}` : null,
    directoryUri: `file:///synthetic/benchmark-${index}/`, clipUris: [],
  }));
  const configurations: SupportedCaptureConfiguration[] = ["pip", "split", "discrete"].flatMap((mode) =>
    ["wide", "ultra", "tele"].map((camera) => ({
      kind: "supported", id: `${mode}:${camera}:front`, mode,
      output: mode === "discrete" ? "dual-files" : "composite-file",
      cameraIds: [camera, "front"], profile: "core1080p", codec: "h264",
      bitrate: 16_000_000, stabilization: "standard", estimatedHardwareCost: 0.8,
      availability: "available", frameRates: [24, 25, 30],
    } as SupportedCaptureConfiguration)),
  );
  const requests = Array.from({ length: iterations }, (_, index) => ({
    mode: (["pip", "split", "discrete"] as const)[index % 3]!,
    camera: ["wide", "ultra", "tele"][index % 3]!,
  }));
  const workloads = [
    workload("manifest-decode", () => encoded.map(decodeRecordingSetManifest), (results) => {
      assert.equal(results.length, manifests.length);
      results.forEach((result, index) => {
        assert(result.ok, "a valid manifest was rejected");
        assert.deepEqual(result.value, manifests[index], "manifest data changed");
      });
    }),
    workload("library-labels", () => entries.map((entry) => ({
      label: recordingDisplayName(entry), duration: formatRecordingDuration(recordingDurationMs(entry)),
    })), (results) => {
      assert.equal(results.length, entries.length);
      results.forEach((result, index) => {
        const entry = entries[index]!;
        assert(result.label.length > 0, "library label is empty");
        if (entry.name !== null) assert.equal(result.label, entry.name);
        assert.equal(result.duration, entry.outcome.kind === "ready" ? "0:04" : "0:00");
      });
    }),
    workload("camera-selection-churn", () => requests.map(({ mode, camera }) => {
      const initial = resolveSelection(configurations, mode, camera, "front");
      return { initial, swapped: selectCamera(configurations, mode, initial, "front") };
    }), (results) => {
      assert.equal(results.length, iterations);
      results.forEach(({ initial, swapped }, index) => {
        assert.equal(initial?.leadingCameraId, requests[index]!.camera);
        assert.equal(initial?.trailingCameraId, "front");
        assert.equal(swapped?.leadingCameraId, "front");
        assert.equal(swapped?.trailingCameraId, requests[index]!.camera);
        assert.equal(swapped?.configurationId, initial?.configurationId);
      });
    }),
  ];
  return { fixtures: { manifests, configurations, requests }, workloads };
}
