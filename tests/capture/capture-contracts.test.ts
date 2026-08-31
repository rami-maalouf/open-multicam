import {
  CAPTURE_EVENT_CADENCE,
  CAPTURE_STATE_KINDS,
  CAPTURE_TERMINAL_STATE_KINDS,
  type CaptureMode,
  type CaptureOutput,
  type CaptureState,
  type DeviceCapabilities,
  type ResolvedCapturePreset,
} from "@/core/capture/types";
import {
  isTerminalCaptureState,
  resolveCapturePreset,
  validateCaptureRequest,
} from "@/core/capture/contracts";
import {
  CAPTURE_ERROR_CODES,
  createCaptureError,
} from "@/core/capture/errors";
import { failure, success } from "@/core/results/result";

const cameras = [
  {
    id: "back-wide",
    label: "Wide",
    position: "back",
    deviceType: "wide",
    fieldOfViewDegrees: 72,
    zoomRange: { minimum: 1, maximum: 6 },
    supportsFocusPoint: true,
    supportsExposurePoint: true,
    supportsTorch: true,
  },
  {
    id: "front-wide",
    label: "Front",
    position: "front",
    deviceType: "wide",
    fieldOfViewDegrees: 80,
    zoomRange: { minimum: 1, maximum: 1 },
    supportsFocusPoint: true,
    supportsExposurePoint: true,
    supportsTorch: false,
  },
] as const;

const capabilities: DeviceCapabilities = {
  kind: "device-capabilities",
  schemaVersion: 1,
  discoveredAtMs: 1_788_195_600_000,
  cameras,
  multicam: { kind: "supported" },
  configurations: [
    {
      kind: "supported",
      id: "single-front",
      mode: "single",
      output: "single-file",
      cameraIds: ["front-wide"],
      frameRates: [24, 25, 30],
      availability: "available",
      profile: "core1080p",
      codec: "h264",
      bitrate: 12_000_000,
      stabilization: "standard",
      estimatedHardwareCost: 0.2,
    },
    {
      kind: "supported",
      id: "discrete-pair",
      mode: "discrete",
      output: "dual-files",
      cameraIds: ["back-wide", "front-wide"],
      frameRates: [24, 30],
      availability: "recommended",
      profile: "core1080p",
      codec: "h264",
      bitrate: 12_000_000,
      stabilization: "standard",
      estimatedHardwareCost: 0.68,
    },
    {
      kind: "supported",
      id: "pip-pair",
      mode: "pip",
      output: "composite-file",
      cameraIds: ["back-wide", "front-wide"],
      frameRates: [24, 25, 30],
      availability: "available",
      profile: "core1080p",
      codec: "h264",
      bitrate: 12_000_000,
      stabilization: "standard",
      estimatedHardwareCost: 0.74,
    },
    {
      kind: "supported",
      id: "split-pair",
      mode: "split",
      output: "composite-file",
      cameraIds: ["back-wide", "front-wide"],
      frameRates: [24, 25, 30],
      availability: "high-pressure",
      profile: "core1080p",
      codec: "h264",
      bitrate: 12_000_000,
      stabilization: "standard",
      estimatedHardwareCost: 0.8,
    },
    {
      kind: "unavailable",
      id: "unavailable-discrete",
      mode: "discrete",
      output: "dual-files",
      cameraIds: ["back-wide", "front-wide"],
      reason: {
        kind: "hardware-budget-exceeded",
        message: "This camera pair needs more processing headroom.",
      },
    },
  ],
  recommendedConfigurationId: "discrete-pair",
};

const outputByMode = {
  single: "single-file",
  discrete: "dual-files",
  pip: "composite-file",
  split: "composite-file",
} as const satisfies Record<CaptureMode, CaptureOutput>;

const configurationIdByMode = {
  single: "single-front",
  discrete: "discrete-pair",
  pip: "pip-pair",
  split: "split-pair",
} as const satisfies Record<CaptureMode, string>;

function requestFor(mode: CaptureMode): Record<string, unknown> {
  return {
    configurationId: configurationIdByMode[mode],
    mode,
    output: outputByMode[mode],
    cameraAId: mode === "single" ? "front-wide" : "back-wide",
    ...(mode === "single" ? {} : { cameraBId: "front-wide" }),
    orientation: "landscape",
    frameRate: 24,
  };
}

function expectErrorCode(
  result: ReturnType<typeof validateCaptureRequest>,
  code: (typeof CAPTURE_ERROR_CODES)[number],
) {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe(code);
  }
}

describe("capture request validation", () => {
  it.each(["single", "discrete", "pip", "split"] as const)(
    "validates the supported %s contract",
    (mode) => {
      const result = validateCaptureRequest(requestFor(mode), capabilities);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.mode).toBe(mode);
        expect(result.value.output).toBe(outputByMode[mode]);

        const preset = resolveCapturePreset(result.value, capabilities);
        expect(preset).toEqual(
          success(
            expect.objectContaining({
              mode,
              output: outputByMode[mode],
              width: 1920,
              height: 1080,
              frameRate: 24,
              codec: "h264",
            }),
          ),
        );
      }
    },
  );

  it("rotates the resolved dimensions for portrait output", () => {
    const input = { ...requestFor("single"), orientation: "portrait" };
    const request = validateCaptureRequest(input, capabilities);

    expect(request.ok).toBe(true);
    if (request.ok) {
      expect(resolveCapturePreset(request.value, capabilities)).toEqual(
        success(expect.objectContaining({ width: 1080, height: 1920 })),
      );
    }
  });

  it.each([
    [null, "invalid_request"],
    [{}, "invalid_request"],
    [{ ...requestFor("single"), mode: "spatial" }, "unsupported_mode"],
    [{ ...requestFor("single"), frameRate: 60 }, "unsupported_frame_rate"],
    [{ ...requestFor("discrete"), frameRate: 25 }, "unsupported_frame_rate"],
    [{ ...requestFor("single"), orientation: "square" }, "invalid_request"],
    [{ ...requestFor("single"), output: "raw-file" }, "unsupported_output"],
    [{ ...requestFor("single"), output: "dual-files" }, "unsupported_output"],
    [
      { ...requestFor("single"), cameraBId: "back-wide" },
      "unsupported_output",
    ],
    [
      { ...requestFor("discrete"), cameraBId: undefined },
      "invalid_request",
    ],
    [
      { ...requestFor("discrete"), cameraBId: "back-wide" },
      "duplicate_camera",
    ],
    [
      { ...requestFor("discrete"), cameraBId: "missing-camera" },
      "camera_pair_unsupported",
    ],
    [
      { ...requestFor("single"), cameraAId: "missing-camera" },
      "camera_unavailable",
    ],
    [
      { ...requestFor("discrete"), configurationId: "unavailable-discrete" },
      "configuration_unavailable",
    ],
    [
      { ...requestFor("discrete"), configurationId: "missing-configuration" },
      "configuration_unavailable",
    ],
    [
      { ...requestFor("single"), configurationId: "discrete-pair" },
      "unsupported_mode",
    ],
  ] as const)("rejects an invalid boundary value", (input, code) => {
    expectErrorCode(validateCaptureRequest(input, capabilities), code);
  });

  it("rejects a configuration that no longer supports the validated request", () => {
    const request = validateCaptureRequest(requestFor("single"), capabilities);
    expect(request.ok).toBe(true);

    if (request.ok) {
      const changedCapabilities: DeviceCapabilities = {
        ...capabilities,
        configurations: capabilities.configurations.filter(
          (configuration) => configuration.id !== "single-front",
        ),
      };

      expect(resolveCapturePreset(request.value, changedCapabilities)).toEqual(
        failure(createCaptureError("configuration_unavailable")),
      );
    }
  });
});

describe("capture lifecycle states", () => {
  const preset: ResolvedCapturePreset = {
    configurationId: "discrete-pair",
    mode: "discrete",
    output: "dual-files",
    cameraAId: "back-wide",
    cameraBId: "front-wide",
    orientation: "landscape",
    profile: "core1080p",
    width: 1920,
    height: 1080,
    frameRate: 24,
    codec: "h264",
    bitrate: 12_000_000,
    stabilization: "standard",
  };

  const states: readonly CaptureState[] = [
    { kind: "idle" },
    { kind: "configuring", requestId: "request-1" },
    { kind: "previewing", preset },
    { kind: "preparing", recordingSetId: "set-1", preset },
    { kind: "ready", recordingSetId: "set-1", preset },
    { kind: "starting", recordingSetId: "set-1", preset },
    {
      kind: "recording",
      recordingSetId: "set-1",
      preset,
      startedAtMs: 1_788_195_600_000,
    },
    { kind: "stopping", recordingSetId: "set-1", reason: "user-requested" },
    { kind: "finalizing", recordingSetId: "set-1" },
    { kind: "completed", recordingSetId: "set-1", durationMs: 1_000 },
    {
      kind: "interrupted",
      recordingSetId: "set-1",
      reason: "backgrounded",
      recoverable: false,
    },
    {
      kind: "recoverable",
      recordingSetId: "set-1",
      reason: "writer-failed",
      playableAssetCount: 1,
    },
    { kind: "failed", error: createCaptureError("internal_failure") },
  ];

  it("enumerates every public lifecycle state exactly once", () => {
    expect(states.map((state) => state.kind)).toEqual(CAPTURE_STATE_KINDS);
  });

  it("classifies every terminal state exhaustively", () => {
    const terminalKinds = states
      .filter(isTerminalCaptureState)
      .map((state) => state.kind);

    expect(terminalKinds).toEqual(CAPTURE_TERMINAL_STATE_KINDS);
  });
});

describe("capture errors and results", () => {
  it.each(CAPTURE_ERROR_CODES)("creates a sanitized %s failure", (code) => {
    const error = createCaptureError(code);

    expect(error).toEqual({
      kind: "capture-error",
      code,
      message: expect.any(String),
      retryable: expect.any(Boolean),
      recoveryAction: expect.any(String),
    });
    expect(error.message.length).toBeGreaterThan(0);
    expect(Object.keys(error).sort()).toEqual([
      "code",
      "kind",
      "message",
      "recoveryAction",
      "retryable",
    ]);
    expect(JSON.stringify(error)).not.toMatch(
      /nativeError|NSError|stackTrace|\/Users\//i,
    );
  });

  it("uses one explicit success or failure branch", () => {
    expect(success({ recordingSetId: "set-1" })).toEqual({
      ok: true,
      value: { recordingSetId: "set-1" },
    });
    expect(failure(createCaptureError("cancelled"))).toEqual({
      ok: false,
      error: createCaptureError("cancelled"),
    });
  });
});

describe("capture bridge event cadence", () => {
  it("keeps progress and diagnostics bounded below per-frame frequency", () => {
    expect(CAPTURE_EVENT_CADENCE).toEqual({
      recordingProgressMaximumHz: 2,
      diagnosticsMaximumHz: 1,
    });
    expect(Object.keys(CAPTURE_EVENT_CADENCE)).not.toContain("frames");
    expect(Object.keys(CAPTURE_EVENT_CADENCE)).not.toContain("sampleBuffers");
  });
});
