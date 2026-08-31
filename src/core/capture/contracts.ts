import {
  createCaptureError,
  type CaptureError,
} from "@/core/capture/errors";
import {
  CAPTURE_ORIENTATIONS,
  CAPTURE_TERMINAL_STATE_KINDS,
  RELEASE_CAPTURE_MODES,
  RELEASE_CAPTURE_OUTPUTS,
  RELEASE_FRAME_RATES,
  type CaptureFrameRate,
  type CaptureMode,
  type CaptureOrientation,
  type CaptureOutput,
  type CaptureRequest,
  type CaptureState,
  type CaptureTerminalState,
  type DeviceCapabilities,
  type ResolvedCapturePreset,
  type SupportedCaptureConfiguration,
} from "@/core/capture/types";
import { failure, success, type Result } from "@/core/results/result";

export type CaptureResult<T> = Result<T, CaptureError>;

const expectedOutputByMode = {
  single: "single-file",
  discrete: "dual-files",
  pip: "composite-file",
  split: "composite-file",
} as const satisfies Record<CaptureMode, CaptureOutput>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCaptureMode(value: unknown): value is CaptureMode {
  return RELEASE_CAPTURE_MODES.includes(value as CaptureMode);
}

function isCaptureOutput(value: unknown): value is CaptureOutput {
  return RELEASE_CAPTURE_OUTPUTS.includes(value as CaptureOutput);
}

function isCaptureOrientation(value: unknown): value is CaptureOrientation {
  return CAPTURE_ORIENTATIONS.includes(value as CaptureOrientation);
}

function isCaptureFrameRate(value: unknown): value is CaptureFrameRate {
  return (
    typeof value === "number" &&
    RELEASE_FRAME_RATES.includes(value as CaptureFrameRate)
  );
}

function camerasMatch(
  configuration: SupportedCaptureConfiguration,
  cameraAId: string,
  cameraBId: string | undefined,
): boolean {
  if (configuration.mode === "single") {
    return cameraBId === undefined && configuration.cameraIds[0] === cameraAId;
  }

  return (
    cameraBId !== undefined &&
    configuration.cameraIds.includes(cameraAId) &&
    configuration.cameraIds.includes(cameraBId)
  );
}

function configurationMatchesRequest(
  configuration: SupportedCaptureConfiguration,
  request: CaptureRequest,
): boolean {
  return (
    configuration.id === request.configurationId &&
    configuration.mode === request.mode &&
    configuration.output === request.output &&
    configuration.frameRates.includes(request.frameRate) &&
    camerasMatch(configuration, request.cameraAId, request.cameraBId)
  );
}

export function validateCaptureRequest(
  input: unknown,
  capabilities: DeviceCapabilities,
): CaptureResult<CaptureRequest> {
  if (!isRecord(input)) {
    return failure(createCaptureError("invalid_request"));
  }

  const {
    configurationId,
    mode,
    output,
    cameraAId,
    cameraBId,
    orientation,
    frameRate,
  } = input;

  if (!isNonEmptyString(configurationId) || !isNonEmptyString(cameraAId)) {
    return failure(createCaptureError("invalid_request"));
  }

  if (!isCaptureMode(mode)) {
    return failure(createCaptureError("unsupported_mode"));
  }

  if (!isCaptureOutput(output) || output !== expectedOutputByMode[mode]) {
    return failure(createCaptureError("unsupported_output"));
  }

  if (!isCaptureFrameRate(frameRate)) {
    return failure(createCaptureError("unsupported_frame_rate"));
  }

  if (!isCaptureOrientation(orientation)) {
    return failure(createCaptureError("invalid_request"));
  }

  if (mode === "single") {
    if (cameraBId !== undefined) {
      return failure(createCaptureError("unsupported_output"));
    }
  } else {
    if (!isNonEmptyString(cameraBId)) {
      return failure(createCaptureError("invalid_request"));
    }

    if (cameraAId === cameraBId) {
      return failure(createCaptureError("duplicate_camera"));
    }
  }

  const capability = capabilities.configurations.find(
    (configuration) => configuration.id === configurationId,
  );

  if (capability === undefined || capability.kind === "unavailable") {
    return failure(createCaptureError("configuration_unavailable"));
  }

  if (capability.mode !== mode) {
    return failure(createCaptureError("unsupported_mode"));
  }

  if (!capability.frameRates.includes(frameRate)) {
    return failure(createCaptureError("unsupported_frame_rate"));
  }

  if (!camerasMatch(capability, cameraAId, cameraBId as string | undefined)) {
    return failure(
      createCaptureError(
        mode === "single" ? "camera_unavailable" : "camera_pair_unsupported",
      ),
    );
  }

  if (mode === "single") {
    return success({
      configurationId,
      mode,
      output,
      cameraAId,
      orientation,
      frameRate,
    } as CaptureRequest);
  }

  return success({
    configurationId,
    mode,
    output,
    cameraAId,
    cameraBId,
    orientation,
    frameRate,
  } as CaptureRequest);
}

export function resolveCapturePreset(
  request: CaptureRequest,
  capabilities: DeviceCapabilities,
): CaptureResult<ResolvedCapturePreset> {
  const configuration = capabilities.configurations.find(
    (candidate): candidate is SupportedCaptureConfiguration =>
      candidate.kind === "supported" &&
      configurationMatchesRequest(candidate, request),
  );

  if (configuration === undefined) {
    return failure(createCaptureError("configuration_unavailable"));
  }

  const dimensions =
    request.orientation === "portrait"
      ? { width: 1080, height: 1920 }
      : { width: 1920, height: 1080 };
  const preset = {
    configurationId: request.configurationId,
    mode: request.mode,
    output: request.output,
    cameraAId: request.cameraAId,
    ...(request.cameraBId === undefined
      ? {}
      : { cameraBId: request.cameraBId }),
    orientation: request.orientation,
    profile: configuration.profile,
    ...dimensions,
    frameRate: request.frameRate,
    codec: configuration.codec,
    bitrate: configuration.bitrate,
    stabilization: configuration.stabilization,
  } as ResolvedCapturePreset;

  return success(preset);
}

export function isTerminalCaptureState(
  state: CaptureState,
): state is CaptureTerminalState {
  return CAPTURE_TERMINAL_STATE_KINDS.includes(
    state.kind as CaptureTerminalState["kind"],
  );
}
