import type {
  CaptureMode,
  SupportedCaptureConfiguration,
} from "@/core/capture/types";

export type CameraSlotSelection = Readonly<{
  configurationId: string;
  mode: CaptureMode;
  // slot one: the full screen camera in pip, the top pane in split
  leadingCameraId: string;
  // slot two: absent only in single mode
  trailingCameraId?: string;
}>;

function configurationsFor(
  configurations: readonly SupportedCaptureConfiguration[],
  mode: CaptureMode,
): readonly SupportedCaptureConfiguration[] {
  return configurations.filter((configuration) => configuration.mode === mode);
}

function toSelection(
  configuration: SupportedCaptureConfiguration,
  preferredLeading: string | null,
): CameraSlotSelection {
  const ids = configuration.cameraIds;

  if (configuration.mode === "single") {
    return {
      configurationId: configuration.id,
      mode: configuration.mode,
      leadingCameraId: ids[0],
    };
  }

  // the native resolver compares camera sets rather than ordered lists, so
  // either camera may take slot one
  const leadingCameraId =
    preferredLeading !== null && ids.includes(preferredLeading)
      ? preferredLeading
      : ids[0];

  return {
    configurationId: configuration.id,
    mode: configuration.mode,
    leadingCameraId,
    trailingCameraId: ids.find((id) => id !== leadingCameraId) ?? ids[1],
  };
}

/**
 * Picks the configuration that honours as much of the requested pairing as the
 * hardware allows, preferring an exact pair, then the requested slot one
 * camera, then anything valid in that mode.
 */
export function resolveSelection(
  configurations: readonly SupportedCaptureConfiguration[],
  mode: CaptureMode,
  preferredLeading: string | null,
  preferredTrailing: string | null,
): CameraSlotSelection | null {
  const candidates = configurationsFor(configurations, mode);
  const fallback = candidates[0];

  if (fallback === undefined) {
    return null;
  }

  if (mode === "single") {
    const exact = candidates.find(
      (configuration) => configuration.cameraIds[0] === preferredLeading,
    );
    return toSelection(exact ?? fallback, preferredLeading);
  }

  const exactPair =
    preferredLeading !== null && preferredTrailing !== null
      ? candidates.find(
          (configuration) =>
            configuration.cameraIds.includes(preferredLeading) &&
            configuration.cameraIds.includes(preferredTrailing),
        )
      : undefined;

  if (exactPair !== undefined) {
    return toSelection(exactPair, preferredLeading);
  }

  const withLeading =
    preferredLeading !== null
      ? candidates.find((configuration) =>
          configuration.cameraIds.includes(preferredLeading),
        )
      : undefined;

  return toSelection(withLeading ?? fallback, preferredLeading);
}

/**
 * Cameras that can share a configuration with `leadingCameraId` in this mode.
 * Everything outside this set has to re-root the selection rather than pair
 * with the current slot one camera.
 */
export function partnersFor(
  configurations: readonly SupportedCaptureConfiguration[],
  mode: CaptureMode,
  leadingCameraId: string | null,
): ReadonlySet<string> {
  if (leadingCameraId === null || mode === "single") {
    return new Set();
  }

  const partners = configurationsFor(configurations, mode)
    .filter((configuration) => configuration.cameraIds.includes(leadingCameraId))
    .flatMap((configuration) =>
      configuration.cameraIds.filter((id) => id !== leadingCameraId),
    );

  return new Set(partners);
}

/**
 * Cameras usable at all in this mode, so the sheet can dim the rest instead of
 * offering a pairing the session would reject.
 */
export function camerasFor(
  configurations: readonly SupportedCaptureConfiguration[],
  mode: CaptureMode,
): ReadonlySet<string> {
  return new Set(
    configurationsFor(configurations, mode).flatMap(
      (configuration) => configuration.cameraIds,
    ),
  );
}

/**
 * Applies a tap on a camera tile. Tapping slot two promotes it to slot one,
 * which for an unchanged pair is the same swap the preview tap performs.
 * Tapping an unpaired camera re-roots the selection around it.
 */
export function selectCamera(
  configurations: readonly SupportedCaptureConfiguration[],
  mode: CaptureMode,
  current: CameraSlotSelection | null,
  cameraId: string,
): CameraSlotSelection | null {
  if (mode === "single") {
    return resolveSelection(configurations, mode, cameraId, null);
  }

  if (current === null) {
    return resolveSelection(configurations, mode, cameraId, null);
  }

  if (cameraId === current.leadingCameraId) {
    return current;
  }

  if (cameraId === current.trailingCameraId) {
    return resolveSelection(
      configurations,
      mode,
      cameraId,
      current.leadingCameraId,
    );
  }

  const partners = partnersFor(configurations, mode, current.leadingCameraId);

  if (partners.has(cameraId)) {
    return resolveSelection(
      configurations,
      mode,
      current.leadingCameraId,
      cameraId,
    );
  }

  return resolveSelection(configurations, mode, cameraId, null);
}

/**
 * Modes the device can actually run, in the order the sheet lists them.
 */
export function availableModes(
  configurations: readonly SupportedCaptureConfiguration[],
): readonly CaptureMode[] {
  const order: readonly CaptureMode[] = ["pip", "split", "discrete", "single"];
  return order.filter((mode) =>
    configurations.some((configuration) => configuration.mode === mode),
  );
}
