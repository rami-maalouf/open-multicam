import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomSheet } from "@expo/ui";

import {
  CaptureSurfaceView,
  multicamCaptureModule,
} from "../../../modules/multicam-capture";
import { AdaptiveMaterial } from "@/components/adaptive-material";
import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import { validateCaptureRequest } from "@/core/capture/contracts";
import {
  availableModes,
  camerasFor,
  partnersFor,
  resolveSelection,
  selectCamera,
  type CameraSlotSelection,
} from "@/core/capture/selection";
import type {
  CameraDescriptor,
  CameraDeviceType,
  CaptureBridgeEvent,
  CaptureMode,
  CapturePermissionStatus,
  CaptureRequest,
  CaptureState,
  DeviceCapabilities,
  SupportedCaptureConfiguration,
} from "@/core/capture/types";
import {
  reportRecorderFailure,
  reportRecorderSuccess,
} from "@/core/telemetry/recorder";
import { playHaptic } from "@/foundation/haptics/haptics";
import { colors, radii, spacing } from "@/theme";

type CapturePhase =
  | "checking"
  | "needs-permission"
  | "permission-blocked"
  | "configuring"
  | "ready"
  | "recording"
  | "finalizing"
  | "unavailable"
  | "failed";

const simulatorCameraRetryMs = 1_000;

function supportedConfigurations(
  capabilities: DeviceCapabilities,
): readonly SupportedCaptureConfiguration[] {
  return capabilities.configurations.filter(
    (configuration): configuration is SupportedCaptureConfiguration =>
      configuration.kind === "supported" &&
      (configuration.mode === "single" ||
        configuration.mode === "discrete" ||
        configuration.mode === "pip" ||
        configuration.mode === "split"),
  );
}

function preferredFrameRate(
  configuration: SupportedCaptureConfiguration,
): 24 | 25 | 30 {
  if (configuration.frameRates.includes(30)) {
    return 30;
  }
  return configuration.frameRates[0] ?? 30;
}

// resolves slot one first, so the partner is always the *other* camera and
// never collapses onto the same id
function orderedPair(
  configuration: SupportedCaptureConfiguration,
  leadingCameraId: string | undefined,
): readonly [string, string] {
  const ids: readonly string[] = configuration.cameraIds;
  const first = ids[0] ?? "";
  const leading =
    leadingCameraId !== undefined && ids.includes(leadingCameraId)
      ? leadingCameraId
      : first;
  return [leading, ids.find((id) => id !== leading) ?? ids[1] ?? first];
}

function createRequest(
  configuration: SupportedCaptureConfiguration,
  orientation: "portrait" | "landscape",
  // the camera the viewer put in slot one: full screen in pip, top in split
  leadingCameraId?: string,
): CaptureRequest {
  const common = {
    configurationId: configuration.id,
    orientation,
    frameRate: preferredFrameRate(configuration),
  };

  if (configuration.mode === "single") {
    return {
      ...common,
      mode: "single",
      output: "single-file",
      cameraAId: configuration.cameraIds[0],
    } as CaptureRequest;
  }

  if (configuration.mode === "pip" || configuration.mode === "split") {
    const [cameraAId, cameraBId] = orderedPair(configuration, leadingCameraId);
    return {
      ...common,
      mode: configuration.mode,
      output: "composite-file",
      cameraAId,
      cameraBId,
    } as CaptureRequest;
  }

  const [cameraAId, cameraBId] = orderedPair(configuration, leadingCameraId);
  return {
    ...common,
    mode: "discrete",
    output: "dual-files",
    cameraAId,
    cameraBId,
  } as CaptureRequest;
}

// the sheet reads as a zoom ladder even though each tile is a separate
// sensor: 0.5x, 1x, 3x is how people already think about these lenses
const zoomLabelByDeviceType: Partial<Record<CameraDeviceType, string>> = {
  "ultra-wide": "0.5\u00d7",
  wide: "1\u00d7",
  telephoto: "3\u00d7",
};

function cameraTileLabel(camera: CameraDescriptor): string {
  if (camera.position === "front") {
    return "Selfie";
  }
  return zoomLabelByDeviceType[camera.deviceType] ?? camera.label;
}

function cameraTileCaption(camera: CameraDescriptor): string {
  switch (camera.deviceType) {
    case "ultra-wide":
      return "Ultra Wide";
    case "wide":
      return "Wide";
    case "telephoto":
      return "Telephoto";
    case "true-depth":
      return "Front";
    default:
      return camera.label;
  }
}

function modeTitle(mode: CaptureMode): string {
  switch (mode) {
    case "pip":
      return "Picture in picture";
    case "split":
      return "Split";
    case "discrete":
      return "Two files";
    default:
      return "Single";
  }
}

function modeIcon(mode: CaptureMode): string {
  switch (mode) {
    case "pip":
      return "rectangle.inset.filled";
    case "split":
      return "rectangle.split.1x2";
    case "discrete":
      return "square.on.square";
    default:
      return "camera.fill";
  }
}

function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, "0")}:${(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function permissionMessage(status: CapturePermissionStatus): string {
  return status === "restricted"
    ? "Camera access is restricted on this iPhone."
    : "Camera access is off. Open Settings to use OpenMulticam.";
}

export function CaptureScreen() {
  const dimensions = useWindowDimensions();
  const orientation =
    dimensions.width > dimensions.height ? "landscape" : "portrait";
  const [phase, setPhase] = useState<CapturePhase>("checking");
  const [message, setMessage] = useState("Checking camera access…");
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(
    null,
  );
  const [selectedConfigurationId, setSelectedConfigurationId] = useState<
    string | null
  >(null);
  const [surfaceState, setSurfaceState] =
    useState<CaptureState["kind"]>("idle");
  const [isPickerVisible, setPickerVisible] = useState(false);
  // the camera the viewer put in slot one, so the sheet can badge it
  const [leadingCameraId, setLeadingCameraId] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null,
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const moduleEventSequence = useRef(0);
  const currentConfigurationId = useRef<string | null>(null);
  const isUserStopping = useRef(false);
  const isRediscoveringSimulatorCamera = useRef(false);
  const phaseRef = useRef<CapturePhase>(phase);

  const configurations = useMemo(
    () => (capabilities === null ? [] : supportedConfigurations(capabilities)),
    [capabilities],
  );
  const selectedConfiguration = configurations.find(
    (configuration) => configuration.id === selectedConfigurationId,
  );

  const configurationLabel = useCallback(
    (configuration: SupportedCaptureConfiguration) => {
      const cameras = configuration.cameraIds.map(
        (cameraId) =>
          capabilities?.cameras.find((camera) => camera.id === cameraId)?.label ??
          "Camera",
      );
      return cameras.join(" + ");
    },
    [capabilities],
  );

  const configure = useCallback(
    async (
      discoveredCapabilities: DeviceCapabilities,
      configurationId?: string,
      leadingCameraId?: string,
    ) => {
      const available = supportedConfigurations(discoveredCapabilities);
      const preferredId =
        configurationId ??
        discoveredCapabilities.recommendedConfigurationId ??
        available[0]?.id;
      const configuration = available.find(
        (candidate) => candidate.id === preferredId,
      );

      if (configuration === undefined) {
        setPhase("unavailable");
        setMessage(
          discoveredCapabilities.multicam.kind === "unsupported"
            ? discoveredCapabilities.multicam.reason.message
            : "No supported 1080p camera configuration was found.",
        );
        return;
      }

      setPhase("configuring");
      setMessage("Preparing cameras…");
      const request = createRequest(configuration, orientation, leadingCameraId);
      const validated = validateCaptureRequest(request, discoveredCapabilities);

      if (!validated.ok) {
        setPhase("failed");
        setMessage(validated.error.message);
        return;
      }

      const result = await multicamCaptureModule.configure(validated.value);
      if (!result.ok) {
        setPhase("failed");
        setMessage(result.error.message);
        await playHaptic("error");
        return;
      }

      currentConfigurationId.current = configuration.id;
      setSelectedConfigurationId(configuration.id);
      setLeadingCameraId(validated.value.cameraAId);
      setPhase("ready");
      setMessage(
        configuration.mode === "single"
          ? "Camera is ready."
          : "Both cameras are ready.",
      );
      await playHaptic("captureReady");
    },
    [orientation],
  );

  const refresh = useCallback(async () => {
    setPhase("checking");
    setMessage("Checking camera access…");

    try {
      const permissions = await multicamCaptureModule.getPermissionStatus();
      if (permissions.camera === "not-determined") {
        setPhase("needs-permission");
        setMessage(
          "OpenMulticam needs camera access to show a live preview and microphone access to record sound.",
        );
        return;
      }
      if (
        permissions.camera === "denied" ||
        permissions.camera === "restricted"
      ) {
        setPhase("permission-blocked");
        setMessage(permissionMessage(permissions.camera));
        return;
      }

      const discovered = await multicamCaptureModule.discoverCapabilities();
      setCapabilities(discovered);
      await configure(discovered, currentConfigurationId.current ?? undefined);
    } catch {
      setPhase("failed");
      setMessage("The camera could not be prepared. Try again.");
    }
  }, [configure]);

  const rediscoverSimulatorCamera = useCallback(async () => {
    if (isRediscoveringSimulatorCamera.current) {
      return;
    }

    isRediscoveringSimulatorCamera.current = true;
    try {
      const discovered = await multicamCaptureModule.discoverCapabilities();
      if (supportedConfigurations(discovered).length === 0) {
        return;
      }

      setCapabilities(discovered);
      await configure(discovered, currentConfigurationId.current ?? undefined);
    } catch {
      return;
    } finally {
      isRediscoveringSimulatorCamera.current = false;
    }
  }, [configure]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useFocusEffect(
    useCallback(() => {
      const refreshTimer = setTimeout(() => void refresh(), 0);
      return () => clearTimeout(refreshTimer);
    }, [refresh]),
  );

  useEffect(() => {
    const shouldRetry =
      phase === "unavailable" &&
      capabilities?.isSimulator === true &&
      capabilities.cameras.length === 0;

    if (!shouldRetry) {
      return;
    }

    const retryTimer = setInterval(() => {
      void rediscoverSimulatorCamera();
    }, simulatorCameraRetryMs);

    return () => clearInterval(retryTimer);
  }, [capabilities, phase, rediscoverSimulatorCamera]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active" && !isUserStopping.current) {
          void refresh();
        }
      },
    );
    const moduleSubscription = multicamCaptureModule.addListener(
      "onCaptureEvent",
      (event: CaptureBridgeEvent) => {
        if (
          event.kind === "state-changed" &&
          event.sequence > moduleEventSequence.current
        ) {
          moduleEventSequence.current = event.sequence;
          setSurfaceState(event.state.kind);

          if (event.state.kind === "completed" && !isUserStopping.current) {
            setRecordingStartedAt(null);
            setElapsedMs(0);
            setPhase("checking");
            setMessage("The interrupted take was saved safely.");
            if (AppState.currentState === "active") {
              void refresh();
            }
          } else if (
            event.state.kind === "failed" &&
            phaseRef.current === "recording"
          ) {
            setRecordingStartedAt(null);
            setPhase("failed");
            setMessage(event.state.error.message);
          }
        }
      },
    );

    return () => {
      appStateSubscription.remove();
      moduleSubscription.remove();
    };
  }, [refresh]);

  useEffect(() => {
    if (recordingStartedAt === null) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedMs(Date.now() - recordingStartedAt);
    }, 250);
    return () => clearInterval(timer);
  }, [recordingStartedAt]);

  const requestPermissions = useCallback(async () => {
    const camera = await multicamCaptureModule.requestCameraPermission();
    if (camera.camera !== "authorized") {
      setPhase("permission-blocked");
      setMessage(permissionMessage(camera.camera));
      return;
    }
    await multicamCaptureModule.requestMicrophonePermission();
    await refresh();
  }, [refresh]);

  // the sheet edits a slot selection rather than a configuration id, so the
  // same tap can mean "swap the two" or "switch to a different lens"
  const selection = useMemo<CameraSlotSelection | null>(() => {
    if (selectedConfiguration === undefined) {
      return null;
    }
    const ids = selectedConfiguration.cameraIds;
    const leading =
      leadingCameraId !== null && ids.includes(leadingCameraId)
        ? leadingCameraId
        : ids[0];
    return {
      configurationId: selectedConfiguration.id,
      mode: selectedConfiguration.mode,
      leadingCameraId: leading,
      trailingCameraId: ids.find((id) => id !== leading),
    };
  }, [leadingCameraId, selectedConfiguration]);

  const sheetMode = selection?.mode ?? "pip";

  const applySelection = useCallback(
    async (next: CameraSlotSelection) => {
      if (capabilities === null) {
        return;
      }
      await playHaptic("selection");
      await configure(capabilities, next.configurationId, next.leadingCameraId);
    },
    [capabilities, configure],
  );

  const toggleRecording = useCallback(async () => {
    if (phase === "ready") {
      setPhase("configuring");
      setElapsedMs(0);
      const result = await multicamCaptureModule.startRecording();
      if (!result.ok) {
        await reportRecorderFailure("start", result.error);
        setPhase("failed");
        setMessage(result.error.message);
        await playHaptic("error");
        return;
      }
      setRecordingStartedAt(Date.now());
      setPhase("recording");
      setMessage("Recording");
      await playHaptic("recordingStart");
      return;
    }

    if (phase === "recording") {
      isUserStopping.current = true;
      setPhase("finalizing");
      setMessage("Saving take…");
      const result = await multicamCaptureModule.stopRecording();
      setRecordingStartedAt(null);
      isUserStopping.current = false;
      if (!result.ok) {
        await reportRecorderFailure("stop", result.error);
        setPhase("failed");
        setMessage(result.error.message);
        await playHaptic("error");
        return;
      }
      await reportRecorderSuccess();
      await playHaptic("success");
      if (capabilities !== null && selectedConfigurationId !== null) {
        await configure(capabilities, selectedConfigurationId);
      }
    }
  }, [capabilities, configure, phase, selectedConfigurationId]);

  const canRecord = phase === "ready" || phase === "recording";
  const shouldShowBlockingOverlay = [
    "checking",
    "needs-permission",
    "permission-blocked",
    "unavailable",
    "failed",
  ].includes(phase);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.identity}>
          <View
            style={[
              styles.liveIndicator,
              phase === "recording" && styles.recordingIndicator,
            ]}
          />
          <AppText tone="previewLabel" variant="headline">
            {phase === "recording" ? formatElapsed(elapsedMs) : "OpenMulticam"}
          </AppText>
        </View>
        <View style={styles.navigation}>
          <Link href="/library" asChild>
            <Pressable
              accessibilityLabel="Open library"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.navigationButton}
            >
              <AdaptiveMaterial
                interactive
                material="previewOverlay"
                style={styles.navigationMaterial}
              >
                <Icon
                  name="rectangle.stack"
                  size="control"
                  tone="previewLabel"
                />
              </AdaptiveMaterial>
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.navigationButton}
            >
              <AdaptiveMaterial
                interactive
                material="previewOverlay"
                style={styles.navigationMaterial}
              >
                <Icon name="gearshape" size="control" tone="previewLabel" />
              </AdaptiveMaterial>
            </Pressable>
          </Link>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`Camera preview. Native state ${surfaceState}. ${message}`}
        accessibilityRole="image"
        style={styles.preview}
      >
        <CaptureSurfaceView
          accessible={false}
          style={StyleSheet.absoluteFill}
          testID="native-capture-surface"
        />

        {shouldShowBlockingOverlay ? (
          <View style={styles.blockingOverlay}>
            <View style={styles.previewMark}>
              <Icon name="viewfinder" size="prominent" tone="previewLabel" />
            </View>
            <AppText
              style={styles.overlayTitle}
              tone="previewLabel"
              variant="title"
            >
              Two perspectives. One take.
            </AppText>
            <AppText style={styles.overlayCopy} tone="previewSecondary">
              {message}
            </AppText>
            {phase === "needs-permission" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void requestPermissions()}
                style={styles.permissionButton}
              >
                <AppText tone="previewLabel" variant="headline">
                  Continue
                </AppText>
              </Pressable>
            ) : null}
            {phase === "permission-blocked" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void multicamCaptureModule.openSettings()}
                style={styles.permissionButton}
              >
                <AppText tone="previewLabel" variant="headline">
                  Open Settings
                </AppText>
              </Pressable>
            ) : null}
            {phase === "failed" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void refresh()}
                style={styles.permissionButton}
              >
                <AppText tone="previewLabel" variant="headline">
                  Try Again
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {selectedConfiguration !== undefined && !shouldShowBlockingOverlay ? (
          <Pressable
            accessibilityHint="Choose a supported camera or camera pair"
            accessibilityLabel={`Cameras: ${configurationLabel(selectedConfiguration)}`}
            accessibilityRole="button"
            disabled={phase === "recording" || phase === "finalizing"}
            onPress={() => setPickerVisible(true)}
            style={styles.cameraPickerButton}
          >
            <AdaptiveMaterial material="previewOverlay" style={styles.cameraPill}>
              <Icon
                name={
                  selectedConfiguration.mode === "pip"
                    ? "rectangle.inset.filled"
                    : selectedConfiguration.mode === "discrete"
                    ? "rectangle.split.2x1"
                    : "camera.fill"
                }
                size="compact"
                tone="accent"
              />
              <AppText tone="previewLabel" variant="caption">
                {configurationLabel(selectedConfiguration)}
              </AppText>
              <Icon name="chevron.up.chevron.down" size="compact" tone="previewSecondary" />
            </AdaptiveMaterial>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityHint={
            phase === "recording" ? "Stops and saves this take" : "Starts recording"
          }
          accessibilityLabel={phase === "recording" ? "Stop recording" : "Record"}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canRecord }}
          disabled={!canRecord}
          onPress={() => void toggleRecording()}
          style={[styles.recordControl, !canRecord && styles.recordDisabled]}
        >
          <View
            style={[
              styles.recordControlInner,
              phase === "recording" && styles.stopControlInner,
            ]}
          />
        </Pressable>
        <AppText tone="previewSecondary" variant="caption">
          {phase === "finalizing"
            ? "Saving safely…"
            : `${
                selectedConfiguration === undefined
                  ? 30
                  : preferredFrameRate(selectedConfiguration)
              } fps · H.264`}
        </AppText>
      </View>

      <CameraSheet
        capabilities={capabilities}
        configurations={configurations}
        isVisible={isPickerVisible}
        mode={sheetMode}
        onClose={() => setPickerVisible(false)}
        onSelect={applySelection}
        selection={selection}
      />
    </SafeAreaView>
  );
}

function CameraSheet({
  capabilities,
  configurations,
  isVisible,
  onClose,
  onSelect,
  mode,
  selection,
}: Readonly<{
  capabilities: DeviceCapabilities | null;
  configurations: readonly SupportedCaptureConfiguration[];
  isVisible: boolean;
  onClose: () => void;
  onSelect: (
    next: CameraSlotSelection,
  ) => Promise<void>;
  mode: CaptureMode;
  selection: CameraSlotSelection | null;
}>) {
  const modes = availableModes(configurations);
  const usableCameras = camerasFor(configurations, mode);
  const partners = partnersFor(
    configurations,
    mode,
    selection?.leadingCameraId ?? null,
  );
  const cameras = (capabilities?.cameras ?? []).filter((camera) =>
    usableCameras.has(camera.id),
  );

  const slotFor = (cameraId: string): 1 | 2 | null => {
    if (selection?.leadingCameraId === cameraId) {
      return 1;
    }
    return selection?.trailingCameraId === cameraId ? 2 : null;
  };

  return (
    <BottomSheet
      isPresented={isVisible}
      onDismiss={onClose}
      snapPoints={["half", "full"]}
      testID="camera-sheet"
    >
      <View style={styles.sheet}>
        <AppText variant="title">Cameras</AppText>
        <AppText tone="secondary" variant="callout">
          Tap a camera to make it the second one. Tap it again to make it the
          main one.
        </AppText>

        <View style={styles.styleRow}>
          {modes.map((candidate) => (
            <Pressable
              accessibilityLabel={`${modeTitle(candidate)} style`}
              accessibilityRole="button"
              accessibilityState={{ selected: candidate === mode }}
              key={candidate}
              onPress={() => {
                const next = resolveSelection(
                  configurations,
                  candidate,
                  selection?.leadingCameraId ?? null,
                  selection?.trailingCameraId ?? null,
                );
                if (next !== null) {
                  void onSelect(next);
                }
              }}
              style={[
                styles.styleChip,
                candidate === mode && styles.styleChipSelected,
              ]}
              testID={`camera-sheet-style-${candidate}`}
            >
              <Icon name={modeIcon(candidate)} size="compact" tone="accent" />
              <AppText variant="caption">{modeTitle(candidate)}</AppText>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.tileGrid}>
          {cameras.map((camera) => {
            const slot = slotFor(camera.id);
            const isPairable =
              slot !== null ||
              mode === "single" ||
              partners.has(camera.id) ||
              selection === null;

            return (
              <Pressable
                accessibilityLabel={`${cameraTileCaption(camera)} camera${
                  slot === null ? "" : `, slot ${slot}`
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: slot !== null }}
                key={camera.id}
                onPress={() => {
                  const next = selectCamera(
                    configurations,
                    mode,
                    selection,
                    camera.id,
                  );
                  if (next !== null) {
                    void onSelect(next);
                  }
                }}
                style={[
                  styles.cameraTile,
                  slot !== null && styles.cameraTileSelected,
                  !isPairable && styles.cameraTileDimmed,
                ]}
                testID={`camera-tile-${camera.id}`}
              >
                <View style={styles.cameraTileHeader}>
                  <AppText variant="headline">
                    {cameraTileLabel(camera)}
                  </AppText>
                  {slot === null ? null : (
                    <View style={styles.slotBadge}>
                      <AppText style={styles.slotBadgeText} variant="caption">
                        {slot}
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText tone="secondary" variant="caption">
                  {cameraTileCaption(camera)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.previewChrome, flex: 1 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.control,
    paddingTop: spacing.small,
  },
  identity: { alignItems: "center", flexDirection: "row", gap: spacing.small },
  liveIndicator: {
    backgroundColor: colors.accent,
    borderRadius: radii.capsule,
    height: 8,
    width: 8,
  },
  recordingIndicator: { backgroundColor: colors.recording },
  navigation: { flexDirection: "row", gap: spacing.small },
  navigationButton: { borderRadius: radii.capsule },
  navigationMaterial: {
    alignItems: "center",
    borderRadius: radii.capsule,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  preview: { flex: 1, overflow: "hidden" },
  blockingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(5, 9, 11, 0.82)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: spacing.screen,
    position: "absolute",
    right: 0,
    top: 0,
  },
  previewMark: {
    alignItems: "center",
    borderColor: colors.previewSeparator,
    borderRadius: radii.floating,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    marginBottom: spacing.section,
    width: 72,
  },
  overlayTitle: { maxWidth: 360, textAlign: "center" },
  overlayCopy: { marginTop: spacing.small, maxWidth: 340, textAlign: "center" },
  permissionButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    marginTop: spacing.section,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: spacing.section,
  },
  cameraPickerButton: {
    alignSelf: "center",
    bottom: spacing.control,
    position: "absolute",
  },
  cameraPill: {
    alignItems: "center",
    borderRadius: radii.capsule,
    flexDirection: "row",
    gap: spacing.small,
    maxWidth: 340,
    paddingHorizontal: spacing.regular,
    paddingVertical: spacing.small,
  },
  footer: {
    alignItems: "center",
    gap: spacing.regular,
    paddingBottom: spacing.control,
    paddingTop: spacing.regular,
  },
  recordControl: {
    alignItems: "center",
    borderColor: colors.previewLabel,
    borderRadius: radii.capsule,
    borderWidth: 4,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  recordDisabled: { opacity: 0.42 },
  recordControlInner: {
    backgroundColor: colors.recording,
    borderRadius: radii.capsule,
    height: 60,
    width: 60,
  },
  stopControlInner: { borderRadius: radii.small, height: 34, width: 34 },
  sheet: { gap: spacing.regular, paddingBottom: spacing.control },
  styleRow: { flexDirection: "row", gap: spacing.small },
  styleChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "transparent",
    borderRadius: radii.control,
    borderWidth: 1.5,
    flex: 1,
    gap: spacing.compact,
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.small,
  },
  styleChipSelected: {
    backgroundColor: colors.raisedSurface,
    borderColor: colors.accent,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.small,
    paddingBottom: spacing.control,
  },
  cameraTile: {
    backgroundColor: colors.surface,
    borderColor: "transparent",
    borderRadius: radii.card,
    borderWidth: 2,
    gap: spacing.compact,
    minWidth: 150,
    padding: spacing.regular,
  },
  cameraTileSelected: { borderColor: colors.accent },
  cameraTileDimmed: { opacity: 0.4 },
  cameraTileHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  slotBadge: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.capsule,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  slotBadgeText: { color: colors.previewChrome },
});
