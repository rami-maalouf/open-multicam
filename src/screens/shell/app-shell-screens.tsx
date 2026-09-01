import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import { colors, radii, spacing } from "@/theme";

export { CaptureScreen } from "@/screens/capture/capture-screen";
export { LibraryScreen } from "@/screens/library/library-screen";

export function SettingsScreen() {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.standardScreen}
    >
      <AppText style={styles.sectionLabel} tone="secondary" variant="caption">
        MVP CAPTURE
      </AppText>
      <View style={styles.settingsGroup}>
        <View accessible style={styles.settingsRow}>
          <Icon name="iphone" size="regular" tone="accent" />
          <View style={styles.settingsText}>
            <AppText variant="headline">iPhone capture</AppText>
            <AppText tone="secondary" variant="callout">
              Native single and supported dual-camera pipeline
            </AppText>
          </View>
        </View>
        <View style={styles.separator} />
        <View accessible style={styles.settingsRow}>
          <Icon name="video.fill" size="regular" tone="accentSecondary" />
          <View style={styles.settingsText}>
            <AppText variant="headline">Recording quality</AppText>
            <AppText tone="secondary" variant="callout">
              1080p H.264 · 24, 25, or 30 fps
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
  standardScreen: { backgroundColor: colors.background, flex: 1 },
  scrollContent: {
    gap: spacing.control,
    padding: spacing.control,
    paddingBottom: spacing.spacious,
  },
  sectionLabel: { marginLeft: spacing.regular, marginTop: spacing.small },
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
  settingsText: { flex: 1, gap: spacing.compact },
  separator: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
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
});
