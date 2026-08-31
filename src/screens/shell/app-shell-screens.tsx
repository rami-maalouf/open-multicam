import { Link } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CaptureSurfaceView,
  multicamCaptureModule,
} from "../../../modules/multicam-capture";
import { AdaptiveMaterial } from "@/components/adaptive-material";
import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import type {
  CaptureBridgeEvent,
  CaptureState,
} from "@/core/capture/types";
import { colors, radii, shadows, spacing } from "@/theme";

export function CaptureScreen() {
  const [availabilityMessage, setAvailabilityMessage] = useState(
    "Checking camera compatibility…",
  );
  const [surfaceStateKind, setSurfaceStateKind] =
    useState<CaptureState["kind"]>("idle");
  const latestEventSequence = useRef(0);

  useEffect(() => {
    let isMounted = true;

    multicamCaptureModule
      .discoverCapabilities()
      .then((capabilities) => {
        if (!isMounted) {
          return;
        }

        if (capabilities.multicam.kind === "supported") {
          setAvailabilityMessage("Dual-camera capture is available.");
          return;
        }

        setAvailabilityMessage(capabilities.multicam.reason.message);
      })
      .catch(() => {
        if (isMounted) {
          setAvailabilityMessage("Camera compatibility could not be checked.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCaptureEvent = useCallback(
    ({ nativeEvent }: { nativeEvent: CaptureBridgeEvent }) => {
      if (
        nativeEvent.kind !== "state-changed" ||
        nativeEvent.sequence <= latestEventSequence.current
      ) {
        return;
      }

      latestEventSequence.current = nativeEvent.sequence;
      setSurfaceStateKind(nativeEvent.state.kind);
    },
    [],
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.captureScreen}>
      <View style={styles.captureTopBar}>
        <View style={styles.captureIdentity}>
          <View style={styles.liveIndicator} />
          <AppText tone="previewLabel" variant="headline">
            OpenMulticam
          </AppText>
        </View>
        <View style={styles.captureNavigation}>
          <Link href="/library" asChild>
            <Pressable
              accessibilityHint="Shows recordings stored on this iPhone"
              accessibilityLabel="Open library"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.captureNavigationButton}
            >
              <AdaptiveMaterial
                interactive
                material="previewOverlay"
                style={styles.captureNavigationMaterial}
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
              accessibilityHint="Opens capture preferences"
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.captureNavigationButton}
            >
              <AdaptiveMaterial
                interactive
                material="previewOverlay"
                style={styles.captureNavigationMaterial}
              >
                <Icon name="gearshape" size="control" tone="previewLabel" />
              </AdaptiveMaterial>
            </Pressable>
          </Link>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`Camera preview. Native state ${surfaceStateKind}. ${availabilityMessage}`}
        accessibilityRole="image"
        style={styles.previewSurface}
      >
        <CaptureSurfaceView
          accessible={false}
          onCaptureEvent={handleCaptureEvent}
          style={StyleSheet.absoluteFill}
          testID="native-capture-surface"
        />
        <View pointerEvents="none" style={styles.previewOverlay}>
          <View style={styles.previewMark}>
            <Icon name="viewfinder" size="prominent" tone="previewLabel" />
          </View>
          <AppText
            style={styles.previewTitle}
            tone="previewLabel"
            variant="title"
          >
            Two perspectives. One take.
          </AppText>
          <AppText style={styles.previewCopy} tone="previewSecondary">
            {availabilityMessage}
          </AppText>
        </View>
      </View>

      <View style={styles.captureFooter}>
        <AdaptiveMaterial
          material="previewOverlay"
          style={styles.modePill}
        >
          <Icon name="rectangle.split.2x1" size="compact" tone="accent" />
          <AppText tone="previewLabel" variant="caption">
            Dual camera
          </AppText>
        </AdaptiveMaterial>
        <View
          accessible
          accessibilityHint="Recording becomes available after device compatibility is verified"
          accessibilityLabel="Record"
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          style={styles.recordControl}
        >
          <View style={styles.recordControlInner} />
        </View>
        <AppText tone="previewSecondary" variant="caption">
          1080p · 30 fps
        </AppText>
      </View>
    </SafeAreaView>
  );
}

export function LibraryScreen() {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.standardScreen}
    >
      <View
        accessible
        accessibilityLabel="No recordings yet"
        style={styles.emptyStateCard}
      >
        <View style={styles.emptyStateIcon}>
          <Icon name="rectangle.stack" size="prominent" tone="accent" />
        </View>
        <AppText variant="headline">Your takes stay on this iPhone</AppText>
        <AppText style={styles.supportingCopy} tone="secondary">
          Finished recordings will appear here with their camera layout and
          duration.
        </AppText>
      </View>

      <Link href="/" asChild>
        <Pressable
          accessibilityHint="Returns to the capture screen"
          accessibilityRole="button"
          style={styles.primaryAction}
        >
          <Icon name="camera.fill" size="regular" tone="previewLabel" />
          <AppText tone="previewLabel" variant="headline">
            Open camera
          </AppText>
        </Pressable>
      </Link>

      <Link href="/settings" asChild>
        <Pressable accessibilityRole="button" style={styles.secondaryAction}>
          <AppText tone="accent" variant="headline">
            Capture settings
          </AppText>
          <Icon name="chevron.right" size="compact" tone="accent" />
        </Pressable>
      </Link>
    </ScrollView>
  );
}

export function SettingsScreen() {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.standardScreen}
    >
      <AppText style={styles.sectionLabel} tone="secondary" variant="caption">
        RELEASE 1 FOUNDATION
      </AppText>
      <View style={styles.settingsGroup}>
        <View accessible style={styles.settingsRow}>
          <Icon name="iphone" size="regular" tone="accent" />
          <View style={styles.settingsText}>
            <AppText variant="headline">iPhone capture</AppText>
            <AppText tone="secondary" variant="callout">
              Native multi-camera pipeline
            </AppText>
          </View>
        </View>
        <View style={styles.separator} />
        <View accessible style={styles.settingsRow}>
          <Icon name="video.fill" size="regular" tone="accentSecondary" />
          <View style={styles.settingsText}>
            <AppText variant="headline">Recording quality</AppText>
            <AppText tone="secondary" variant="callout">
              1080p · 24, 25, or 30 fps
            </AppText>
          </View>
        </View>
        <View style={styles.separator} />
        <View accessible style={styles.settingsRow}>
          <Icon name="lock.shield.fill" size="regular" tone="success" />
          <View style={styles.settingsText}>
            <AppText variant="headline">Private by default</AppText>
            <AppText tone="secondary" variant="callout">
              No account, network, or analytics
            </AppText>
          </View>
        </View>
      </View>

      <Link href="/" asChild>
        <Pressable accessibilityRole="button" style={styles.primaryAction}>
          <Icon name="viewfinder" size="regular" tone="previewLabel" />
          <AppText tone="previewLabel" variant="headline">
            Return to capture
          </AppText>
        </Pressable>
      </Link>
      <Link href="/library" asChild>
        <Pressable accessibilityRole="button" style={styles.secondaryAction}>
          <AppText tone="accent" variant="headline">
            Open library
          </AppText>
          <Icon name="chevron.right" size="compact" tone="accent" />
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  captureScreen: {
    backgroundColor: colors.previewChrome,
    flex: 1,
  },
  captureTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.control,
    paddingTop: spacing.small,
  },
  captureIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.small,
  },
  liveIndicator: {
    backgroundColor: colors.accentSecondary,
    borderRadius: radii.capsule,
    height: 8,
    width: 8,
  },
  captureNavigation: {
    flexDirection: "row",
    gap: spacing.small,
  },
  captureNavigationButton: {
    borderRadius: radii.capsule,
  },
  captureNavigationMaterial: {
    alignItems: "center",
    borderRadius: radii.capsule,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  previewSurface: {
    flex: 1,
    overflow: "hidden",
  },
  previewOverlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
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
  previewCopy: {
    marginTop: spacing.small,
    maxWidth: 320,
    textAlign: "center",
  },
  previewTitle: {
    maxWidth: 360,
    textAlign: "center",
  },
  captureFooter: {
    alignItems: "center",
    gap: spacing.regular,
    paddingBottom: spacing.control,
  },
  modePill: {
    alignItems: "center",
    borderRadius: radii.capsule,
    flexDirection: "row",
    gap: spacing.small,
    paddingHorizontal: spacing.regular,
    paddingVertical: spacing.small,
  },
  recordControl: {
    alignItems: "center",
    borderColor: colors.previewLabel,
    borderRadius: radii.capsule,
    borderWidth: 4,
    height: 76,
    justifyContent: "center",
    opacity: 0.52,
    width: 76,
  },
  recordControlInner: {
    backgroundColor: colors.recording,
    borderRadius: radii.capsule,
    height: 60,
    width: 60,
  },
  standardScreen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.control,
    padding: spacing.control,
    paddingBottom: spacing.spacious,
  },
  emptyStateCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.small,
    paddingHorizontal: spacing.section,
    paddingVertical: spacing.spacious,
    ...shadows.floating,
  },
  emptyStateIcon: {
    alignItems: "center",
    backgroundColor: colors.raisedSurface,
    borderRadius: radii.floating,
    height: 72,
    justifyContent: "center",
    marginBottom: spacing.small,
    width: 72,
  },
  supportingCopy: {
    maxWidth: 320,
    textAlign: "center",
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.small,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.control,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.control,
  },
  sectionLabel: {
    marginLeft: spacing.regular,
    marginTop: spacing.small,
  },
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  settingsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.regular,
    minHeight: 72,
    paddingHorizontal: spacing.control,
    paddingVertical: spacing.regular,
  },
  settingsText: {
    flex: 1,
    gap: spacing.compact,
  },
  separator: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
});
