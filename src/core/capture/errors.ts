export const CAPTURE_ERROR_CODES = [
  "invalid_request",
  "unsupported_mode",
  "unsupported_frame_rate",
  "unsupported_output",
  "configuration_unavailable",
  "duplicate_camera",
  "camera_unavailable",
  "camera_pair_unsupported",
  "format_unsupported",
  "multicam_unsupported",
  "hardware_budget_exceeded",
  "camera_permission_denied",
  "camera_permission_restricted",
  "microphone_permission_denied",
  "microphone_permission_restricted",
  "invalid_state_transition",
  "preview_unavailable",
  "storage_insufficient",
  "audio_route_unavailable",
  "writer_not_ready",
  "recording_start_failed",
  "recording_stop_failed",
  "finalization_failed",
  "output_validation_failed",
  "interrupted",
  "media_services_reset",
  "system_pressure_critical",
  "thermal_state_critical",
  "cancelled",
  "internal_failure",
] as const;

export type CaptureErrorCode = (typeof CAPTURE_ERROR_CODES)[number];

export type CaptureRecoveryAction =
  | "none"
  | "retry"
  | "open-settings"
  | "select-configuration"
  | "free-storage"
  | "wait-for-device";

type CaptureErrorDefinition = Readonly<{
  message: string;
  retryable: boolean;
  recoveryAction: CaptureRecoveryAction;
}>;

const captureErrorDefinitions = {
  invalid_request: {
    message: "The capture request is incomplete or malformed.",
    retryable: false,
    recoveryAction: "select-configuration",
  },
  unsupported_mode: {
    message: "This capture mode is not available.",
    retryable: false,
    recoveryAction: "select-configuration",
  },
  unsupported_frame_rate: {
    message: "This frame rate is not available for the selected cameras.",
    retryable: false,
    recoveryAction: "select-configuration",
  },
  unsupported_output: {
    message: "This output is not available for the selected capture mode.",
    retryable: false,
    recoveryAction: "select-configuration",
  },
  configuration_unavailable: {
    message: "The selected camera configuration is no longer available.",
    retryable: true,
    recoveryAction: "select-configuration",
  },
  duplicate_camera: {
    message: "Choose two different cameras for multicamera capture.",
    retryable: false,
    recoveryAction: "select-configuration",
  },
  camera_unavailable: {
    message: "The selected camera is not currently available.",
    retryable: true,
    recoveryAction: "wait-for-device",
  },
  camera_pair_unsupported: {
    message: "These cameras cannot run together in the selected configuration.",
    retryable: false,
    recoveryAction: "select-configuration",
  },
  format_unsupported: {
    message: "The selected cameras do not share the required video format.",
    retryable: false,
    recoveryAction: "select-configuration",
  },
  multicam_unsupported: {
    message: "This device supports single-camera capture only.",
    retryable: false,
    recoveryAction: "select-configuration",
  },
  hardware_budget_exceeded: {
    message: "This configuration needs more processing headroom.",
    retryable: true,
    recoveryAction: "select-configuration",
  },
  camera_permission_denied: {
    message: "Camera access is off for OpenMulticam.",
    retryable: true,
    recoveryAction: "open-settings",
  },
  camera_permission_restricted: {
    message: "Camera access is restricted on this iPhone.",
    retryable: false,
    recoveryAction: "open-settings",
  },
  microphone_permission_denied: {
    message: "Microphone access is off for OpenMulticam.",
    retryable: true,
    recoveryAction: "open-settings",
  },
  microphone_permission_restricted: {
    message: "Microphone access is restricted on this iPhone.",
    retryable: false,
    recoveryAction: "open-settings",
  },
  invalid_state_transition: {
    message: "The camera is not ready for that action.",
    retryable: true,
    recoveryAction: "retry",
  },
  preview_unavailable: {
    message: "The camera preview could not start.",
    retryable: true,
    recoveryAction: "retry",
  },
  storage_insufficient: {
    message: "More free storage is required to record safely.",
    retryable: true,
    recoveryAction: "free-storage",
  },
  audio_route_unavailable: {
    message: "A usable microphone route is not available.",
    retryable: true,
    recoveryAction: "wait-for-device",
  },
  writer_not_ready: {
    message: "Recording is still preparing.",
    retryable: true,
    recoveryAction: "retry",
  },
  recording_start_failed: {
    message: "Recording could not start.",
    retryable: true,
    recoveryAction: "retry",
  },
  recording_stop_failed: {
    message: "Recording stopped unexpectedly.",
    retryable: true,
    recoveryAction: "retry",
  },
  finalization_failed: {
    message: "The recording could not be finalized.",
    retryable: true,
    recoveryAction: "retry",
  },
  output_validation_failed: {
    message: "The recording did not pass its final media check.",
    retryable: false,
    recoveryAction: "none",
  },
  interrupted: {
    message: "Recording was interrupted.",
    retryable: true,
    recoveryAction: "retry",
  },
  media_services_reset: {
    message: "The camera service restarted during capture.",
    retryable: true,
    recoveryAction: "retry",
  },
  system_pressure_critical: {
    message: "Recording stopped to protect capture reliability.",
    retryable: true,
    recoveryAction: "select-configuration",
  },
  thermal_state_critical: {
    message: "Recording stopped because the iPhone became too warm.",
    retryable: true,
    recoveryAction: "wait-for-device",
  },
  cancelled: {
    message: "The capture action was cancelled.",
    retryable: true,
    recoveryAction: "retry",
  },
  internal_failure: {
    message: "The camera service hit an unexpected problem.",
    retryable: true,
    recoveryAction: "retry",
  },
} as const satisfies Record<CaptureErrorCode, CaptureErrorDefinition>;

export type CaptureError = {
  [Code in CaptureErrorCode]: Readonly<{
    kind: "capture-error";
    code: Code;
    message: string;
    retryable: boolean;
    recoveryAction: CaptureRecoveryAction;
    diagnostics?: Readonly<Record<string, unknown>>;
  }>;
}[CaptureErrorCode];

export function createCaptureError<Code extends CaptureErrorCode>(
  code: Code,
): Extract<CaptureError, { code: Code }> {
  const definition = captureErrorDefinitions[code];

  return {
    kind: "capture-error",
    code,
    message: definition.message,
    retryable: definition.retryable,
    recoveryAction: definition.recoveryAction,
  } as Extract<CaptureError, { code: Code }>;
}
