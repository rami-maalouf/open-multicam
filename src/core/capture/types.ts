import type { CaptureError } from "@/core/capture/errors";

export const RELEASE_CAPTURE_MODES = [
  "single",
  "discrete",
  "pip",
  "split",
] as const;
export const RELEASE_FRAME_RATES = [24, 25, 30] as const;
export const RELEASE_CAPTURE_OUTPUTS = [
  "single-file",
  "dual-files",
  "composite-file",
] as const;
export const CAPTURE_ORIENTATIONS = ["portrait", "landscape"] as const;

export type CaptureMode = (typeof RELEASE_CAPTURE_MODES)[number];
export type CaptureFrameRate = (typeof RELEASE_FRAME_RATES)[number];
export type CaptureOutput = (typeof RELEASE_CAPTURE_OUTPUTS)[number];
export type CaptureOrientation = (typeof CAPTURE_ORIENTATIONS)[number];
export type CaptureProfile = "core1080p";
export type CaptureCodec = "h264";
export type CaptureStabilization = "off" | "standard" | "cinematic";

export type CameraPosition = "front" | "back" | "unspecified";
export type CameraDeviceType =
  | "wide"
  | "ultra-wide"
  | "telephoto"
  | "true-depth"
  | "external"
  | "other";

export type CameraDescriptor = Readonly<{
  id: string;
  label: string;
  position: CameraPosition;
  deviceType: CameraDeviceType;
  fieldOfViewDegrees: number;
  zoomRange: Readonly<{
    minimum: number;
    maximum: number;
  }>;
  supportsFocusPoint: boolean;
  supportsExposurePoint: boolean;
  supportsTorch: boolean;
}>;

export type CaptureUnavailableReason =
  | Readonly<{
      kind: "multicam-unsupported";
      message: string;
    }>
  | Readonly<{
      kind: "camera-unavailable";
      message: string;
    }>
  | Readonly<{
      kind: "incompatible-pair";
      message: string;
    }>
  | Readonly<{
      kind: "unsupported-format";
      message: string;
    }>
  | Readonly<{
      kind: "unsupported-frame-rate";
      message: string;
    }>
  | Readonly<{
      kind: "hardware-budget-exceeded";
      message: string;
    }>
  | Readonly<{
      kind: "output-unsupported";
      message: string;
    }>;

type SingleConfigurationIdentity = Readonly<{
  mode: "single";
  output: "single-file";
  cameraIds: readonly [string];
}>;

type DiscreteConfigurationIdentity = Readonly<{
  mode: "discrete";
  output: "dual-files";
  cameraIds: readonly [string, string];
}>;

type CompositeConfigurationIdentity =
  | Readonly<{
      mode: "pip";
      output: "composite-file";
      cameraIds: readonly [string, string];
    }>
  | Readonly<{
      mode: "split";
      output: "composite-file";
      cameraIds: readonly [string, string];
    }>;

export type CaptureConfigurationIdentity =
  | SingleConfigurationIdentity
  | DiscreteConfigurationIdentity
  | CompositeConfigurationIdentity;

export type SupportedCaptureConfiguration =
  CaptureConfigurationIdentity &
    Readonly<{
      kind: "supported";
      id: string;
      frameRates: readonly CaptureFrameRate[];
      availability: "recommended" | "available" | "high-pressure";
      profile: CaptureProfile;
      codec: CaptureCodec;
      bitrate: number;
      stabilization: CaptureStabilization;
      estimatedHardwareCost: number;
    }>;

export type UnavailableCaptureConfiguration =
  CaptureConfigurationIdentity &
    Readonly<{
      kind: "unavailable";
      id: string;
      reason: CaptureUnavailableReason;
    }>;

export type CaptureConfigurationCapability =
  | SupportedCaptureConfiguration
  | UnavailableCaptureConfiguration;

export type DeviceCapabilities = Readonly<{
  kind: "device-capabilities";
  schemaVersion: 1;
  discoveredAtMs: number;
  cameras: readonly CameraDescriptor[];
  multicam:
    | Readonly<{ kind: "supported" }>
    | Readonly<{
        kind: "unsupported";
        reason: CaptureUnavailableReason;
      }>;
  configurations: readonly CaptureConfigurationCapability[];
  recommendedConfigurationId?: string;
}>;

type SingleCaptureSelection = Readonly<{
  mode: "single";
  output: "single-file";
  cameraAId: string;
  cameraBId?: never;
}>;

type DiscreteCaptureSelection = Readonly<{
  mode: "discrete";
  output: "dual-files";
  cameraAId: string;
  cameraBId: string;
}>;

type CompositeCaptureSelection =
  | Readonly<{
      mode: "pip";
      output: "composite-file";
      cameraAId: string;
      cameraBId: string;
    }>
  | Readonly<{
      mode: "split";
      output: "composite-file";
      cameraAId: string;
      cameraBId: string;
    }>;

export type CaptureSelection =
  | SingleCaptureSelection
  | DiscreteCaptureSelection
  | CompositeCaptureSelection;

declare const validatedCaptureRequest: unique symbol;

export type CaptureRequest = CaptureSelection &
  Readonly<{
    configurationId: string;
    orientation: CaptureOrientation;
    frameRate: CaptureFrameRate;
    [validatedCaptureRequest]: true;
  }>;

export type ResolvedCapturePreset = CaptureSelection &
  Readonly<{
    configurationId: string;
    orientation: CaptureOrientation;
    profile: CaptureProfile;
    width: number;
    height: number;
    frameRate: CaptureFrameRate;
    codec: CaptureCodec;
    bitrate: number;
    stabilization: CaptureStabilization;
  }>;

export type CaptureStopReason =
  | "user-requested"
  | "storage-critical"
  | "system-pressure-critical"
  | "backgrounded"
  | "audio-route-lost"
  | "media-services-reset"
  | "writer-failed";

export const CAPTURE_STATE_KINDS = [
  "idle",
  "configuring",
  "previewing",
  "preparing",
  "ready",
  "starting",
  "recording",
  "stopping",
  "finalizing",
  "completed",
  "interrupted",
  "recoverable",
  "failed",
] as const;

export const CAPTURE_TERMINAL_STATE_KINDS = [
  "completed",
  "interrupted",
  "recoverable",
  "failed",
] as const;

export type CaptureState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "configuring"; requestId: string }>
  | Readonly<{ kind: "previewing"; preset: ResolvedCapturePreset }>
  | Readonly<{
      kind: "preparing";
      recordingSetId: string;
      preset: ResolvedCapturePreset;
    }>
  | Readonly<{
      kind: "ready";
      recordingSetId: string;
      preset: ResolvedCapturePreset;
    }>
  | Readonly<{
      kind: "starting";
      recordingSetId: string;
      preset: ResolvedCapturePreset;
    }>
  | Readonly<{
      kind: "recording";
      recordingSetId: string;
      preset: ResolvedCapturePreset;
      startedAtMs: number;
    }>
  | Readonly<{
      kind: "stopping";
      recordingSetId: string;
      reason: CaptureStopReason;
    }>
  | Readonly<{ kind: "finalizing"; recordingSetId: string }>
  | Readonly<{
      kind: "completed";
      recordingSetId: string;
      durationMs: number;
    }>
  | Readonly<{
      kind: "interrupted";
      recordingSetId?: string;
      reason: CaptureStopReason;
      recoverable: boolean;
    }>
  | Readonly<{
      kind: "recoverable";
      recordingSetId: string;
      reason: CaptureStopReason;
      playableAssetCount: number;
    }>
  | Readonly<{
      kind: "failed";
      recordingSetId?: string;
      error: CaptureError;
    }>;

export type CaptureTerminalState = Extract<
  CaptureState,
  {
    kind: (typeof CAPTURE_TERMINAL_STATE_KINDS)[number];
  }
>;

export const CAPTURE_EVENT_CADENCE = {
  recordingProgressMaximumHz: 2,
  diagnosticsMaximumHz: 1,
} as const;

export type CaptureBridgeEvent =
  | Readonly<{
      kind: "state-changed";
      sequence: number;
      state: CaptureState;
    }>
  | Readonly<{
      kind: "recording-progress";
      sequence: number;
      recordingSetId: string;
      elapsedMs: number;
      droppedFrameCount: number;
      freeStorageBytes: number;
    }>
  | Readonly<{
      kind: "diagnostics";
      sequence: number;
      hardwareCost: number;
      systemPressureCost: number;
      thermalState: "nominal" | "fair" | "serious" | "critical";
    }>;
