import { Column, Host, Switch } from "@expo/ui";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import {
  colors,
  radii,
  resolveThemePalette,
  spacing,
  typography,
} from "@/theme";

export function FoundationPreviewScreen() {
  const [largeAccessibilityText, setLargeAccessibilityText] = useState(false);
  const [increaseContrast, setIncreaseContrast] = useState(false);
  const [darkCameraPreview, setDarkCameraPreview] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const lightPalette = resolveThemePalette("light", "standard");
  const darkPalette = resolveThemePalette("dark", "standard");
  const previewPalette = resolveThemePalette(
    darkCameraPreview ? "dark" : "light",
    increaseContrast ? "high" : "standard",
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
    >
      <View style={styles.heading}>
        <AppText variant="largeTitle">Foundation preview</AppText>
        <AppText tone="secondary">
          Development-only controls for reviewing semantic states before native
          capture work begins.
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="headline">Native accessibility controls</AppText>
        <Host matchContents seedColor={colors.accent}>
          <Column spacing={spacing.regular}>
            <Switch
              label="Large accessibility text"
              onValueChange={setLargeAccessibilityText}
              testID="large-accessibility-text-switch"
              value={largeAccessibilityText}
            />
            <Switch
              label="Increase contrast"
              onValueChange={setIncreaseContrast}
              testID="increase-contrast-switch"
              value={increaseContrast}
            />
            <Switch
              label="Dark camera preview"
              onValueChange={setDarkCameraPreview}
              testID="dark-camera-preview-switch"
              value={darkCameraPreview}
            />
            <Switch
              label="Reduce motion"
              onValueChange={setReduceMotion}
              testID="reduce-motion-switch"
              value={reduceMotion}
            />
          </Column>
        </Host>
      </View>

      <View style={styles.appearanceGrid}>
        <View
          accessibilityLabel="Light appearance sample"
          style={[
            styles.appearanceCard,
            { backgroundColor: lightPalette.surface },
          ]}
        >
          <Icon name="sun.max.fill" size="control" tone="accent" />
          <AppText style={{ color: lightPalette.label }} variant="headline">
            Light appearance
          </AppText>
          <AppText style={{ color: lightPalette.secondaryLabel }} variant="caption">
            Warm neutral surface
          </AppText>
        </View>
        <View
          accessibilityLabel="Dark appearance sample"
          style={[
            styles.appearanceCard,
            { backgroundColor: darkPalette.surface },
          ]}
        >
          <Icon name="moon.fill" size="control" tone="previewLabel" />
          <AppText style={{ color: darkPalette.label }} variant="headline">
            Dark appearance
          </AppText>
          <AppText style={{ color: darkPalette.secondaryLabel }} variant="caption">
            Deep graphite surface
          </AppText>
        </View>
      </View>

      <View
        accessibilityLabel="Camera preview readability sample"
        style={[
          styles.cameraPreview,
          { backgroundColor: previewPalette.previewChrome },
        ]}
      >
        <Icon name="viewfinder" size="prominent" tone="previewLabel" />
        <AppText
          style={[
            { color: previewPalette.previewLabel },
            largeAccessibilityText
              ? styles.accessibilityTitleLarge
              : styles.accessibilityTitleRegular,
          ]}
          variant="title"
        >
          {largeAccessibilityText
            ? "Accessibility title at 200% scale"
            : "Accessibility title at standard scale"}
        </AppText>
        <AppText
          style={{ color: previewPalette.previewSecondaryLabel }}
          variant="callout"
        >
          {increaseContrast ? "High contrast" : "Standard contrast"}{" "}
          {darkCameraPreview ? "dark" : "light"} preview
        </AppText>
        <View style={styles.motionStatus}>
          <Icon
            name={reduceMotion ? "pause.fill" : "play.fill"}
            size="compact"
            tone="previewLabel"
          />
          <AppText
            style={{ color: previewPalette.previewLabel }}
            variant="caption"
          >
            {reduceMotion
              ? "Motion transitions disabled"
              : "Motion transitions enabled"}
          </AppText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.section,
    padding: spacing.control,
    paddingBottom: spacing.spacious,
  },
  heading: {
    gap: spacing.small,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.control,
    padding: spacing.control,
  },
  appearanceGrid: {
    flexDirection: "row",
    gap: spacing.regular,
  },
  appearanceCard: {
    borderRadius: radii.card,
    flex: 1,
    gap: spacing.small,
    minHeight: 148,
    padding: spacing.control,
  },
  cameraPreview: {
    alignItems: "center",
    borderRadius: radii.card,
    gap: spacing.regular,
    minHeight: 300,
    padding: spacing.section,
    justifyContent: "center",
  },
  accessibilityTitleRegular: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    textAlign: "center",
  },
  accessibilityTitleLarge: {
    fontSize: 46,
    lineHeight: 52,
    textAlign: "center",
  },
  motionStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.small,
  },
});
