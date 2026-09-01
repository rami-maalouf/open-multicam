import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CaptureSurfaceView,
  multicamCaptureModule,
} from "../../../modules/multicam-capture";
import { AdaptiveMaterial } from "@/components/adaptive-material";
import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import { validateCaptureRequest } from "@/core/capture/contracts";
import type {
  CaptureBridgeEvent,
  CaptureConfigurationCapability,
  CapturePermissionStatus,
  CaptureRequest,
  CaptureState,
  DeviceCapabilities,
  SupportedCaptureConfiguration,
} from "@/core/capture/types";
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

function supportedConfigurations(
  capabilities: DeviceCapabilities,
): readonly SupportedCaptureConfiguration[] {
  return capabilities.configurations.filter(
    (configuration): configuration is SupportedCaptureConfiguration =>
      configuration.kind === "supported" &&
      (configuration.mode === "single" || configuration.mode === "discrete"),
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

function createRequest(
  configuration: SupportedCaptureConfiguration,
  orientation: "portrait" | "landscape",
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

  return {
    ...common,
    mode: "discrete",
    output: "dual-files",
    cameraAId: configuration.cameraIds[0],
    cameraBId: configuration.cameraIds[1],
  } as CaptureRequest;
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
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null,
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const moduleEventSequence = useRef(0);
  const currentConfigurationId = useRef<string | null>(null);
  const isUserStopping = useRef(false);
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
      const request = createRequest(configuration, orientation);
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
      setPhase("ready");
      setMessage(
        configuration.mode === "discrete"
          ? "Both cameras are ready."
          : "Camera is ready.",
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

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const initialRefresh = setTimeout(() => void refresh(), 0);

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
      clearTimeout(initialRefresh);
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

  const selectConfiguration = useCallback(
    async (configurationId: string) => {
      if (capabilities === null) {
        return;
      }
      setPickerVisible(false);
      await playHaptic("selection");
      await configure(capabilities, configurationId);
    },
    [capabilities, configure],
  );

  const toggleRecording = useCallback(async () => {
    if (phase === "ready") {
      setPhase("configuring");
      setElapsedMs(0);
      const result = await multicamCaptureModule.startRecording();
      if (!result.ok) {
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
        setPhase("failed");
        setMessage(result.error.message);
        await playHaptic("error");
        return;
      }
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
                  selectedConfiguration.mode === "discrete"
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

      <ConfigurationPicker
        capabilities={capabilities}
        configurations={configurations}
        isVisible={isPickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={selectConfiguration}
        selectedId={selectedConfigurationId}
      />
    </SafeAreaView>
  );
}

function ConfigurationPicker({
  capabilities,
  configurations,
  isVisible,
  onClose,
  onSelect,
  selectedId,
}: Readonly<{
  capabilities: DeviceCapabilities | null;
  configurations: readonly SupportedCaptureConfiguration[];
  isVisible: boolean;
  onClose: () => void;
  onSelect: (configurationId: string) => Promise<void>;
  selectedId: string | null;
}>) {
  const cameraLabel = (configuration: CaptureConfigurationCapability) =>
    configuration.cameraIds
      .map(
        (cameraId) =>
          capabilities?.cameras.find((camera) => camera.id === cameraId)?.label ??
          "Camera",
      )
      .join(" + ");

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={isVisible}
    >
      <SafeAreaView style={styles.pickerScreen}>
        <View style={styles.pickerHeader}>
          <AppText variant="title">Choose cameras</AppText>
          <Pressable
            accessibilityLabel="Close camera picker"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
          >
            <Icon name="xmark.circle.fill" size="prominent" tone="secondary" />
          </Pressable>
        </View>
        <AppText style={styles.pickerCopy} tone="secondary">
          OpenMulticam only shows combinations your iPhone can record reliably at
          1080p.
        </AppText>
        <ScrollView contentContainerStyle={styles.pickerList}>
          {configurations.map((configuration) => (
            <Pressable
              accessibilityRole="button"
              key={configuration.id}
              onPress={() => void onSelect(configuration.id)}
              style={styles.configurationRow}
            >
              <View style={styles.configurationIcon}>
                <Icon
                  name={
                    configuration.mode === "discrete"
                      ? "rectangle.split.2x1"
                      : "camera.fill"
                  }
                  tone="accent"
                />
              </View>
              <View style={styles.configurationText}>
                <AppText variant="headline">
                  {configuration.mode === "discrete"
                    ? "Two cameras"
                    : "Single camera"}
                </AppText>
                <AppText tone="secondary" variant="callout">
                  {cameraLabel(configuration)} · {configuration.frameRates.join(", ")} fps
                </AppText>
              </View>
              <Icon
                name={
                  selectedId === configuration.id
                    ? "checkmark.circle.fill"
                    : "circle"
                }
                tone={selectedId === configuration.id ? "accent" : "secondary"}
              />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  pickerScreen: { backgroundColor: colors.background, flex: 1 },
  pickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.control,
  },
  pickerCopy: { paddingHorizontal: spacing.control },
  pickerList: { gap: spacing.small, padding: spacing.control },
  configurationRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.regular,
    minHeight: 76,
    padding: spacing.regular,
  },
  configurationIcon: {
    alignItems: "center",
    backgroundColor: colors.raisedSurface,
    borderRadius: radii.control,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  configurationText: { flex: 1, gap: spacing.compact },
});
