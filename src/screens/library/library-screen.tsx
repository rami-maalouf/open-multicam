import { Link, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { multicamCaptureModule } from "../../../modules/multicam-capture";
import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import {
  formatRecordingDuration,
  recordingDisplayName,
  recordingDurationMs,
  type RecordingLibraryEntry,
} from "@/core/library/entry";
import { colors, radii, shadows, spacing } from "@/theme";

export function LibraryScreen() {
  const [recordings, setRecordings] = useState<
    readonly RecordingLibraryEntry[]
  >([]);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setErrorMessage(null);
      setRecordings(await multicamCaptureModule.listRecordings());
    } catch {
      setErrorMessage("The recording library could not be read.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const refreshTimer = setTimeout(() => void refresh(), 0);
      return () => clearTimeout(refreshTimer);
    }, [refresh]),
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <AppText tone="secondary">Loading your takes…</AppText>
      </SafeAreaView>
    );
  }

  return (
    <FlatList
      ListEmptyComponent={<EmptyLibrary errorMessage={errorMessage} />}
      contentContainerStyle={[
        styles.listContent,
        recordings.length === 0 && styles.emptyListContent,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      data={recordings}
      keyExtractor={(recording) => recording.recordingSetId}
      refreshControl={
        <RefreshControl
          onRefresh={() => void refresh()}
          refreshing={false}
          tintColor={colors.accent}
        />
      }
      renderItem={({ item }) => <RecordingRow recording={item} />}
      style={styles.screen}
    />
  );
}

function RecordingRow({
  recording,
}: Readonly<{ recording: RecordingLibraryEntry }>) {
  const isDual = recording.mode === "discrete";
  const isPip = recording.mode === "pip";
  const recordingKind = isDual
    ? "Two-camera take"
    : isPip
      ? "Picture-in-picture take"
      : recording.cameraA.label;

  return (
    <Link
      href={`/library/${recording.recordingSetId}` as Href}
      asChild
    >
      <Pressable
        accessibilityHint="Opens playback and recording actions"
        accessibilityRole="button"
        style={({ pressed }) => [styles.recordingRow, pressed && styles.pressed]}
      >
        <View style={styles.recordingArtwork}>
          <Icon
            name={
              isDual
                ? "rectangle.split.2x1.fill"
                : isPip
                  ? "rectangle.inset.filled"
                  : "video.fill"
            }
            size="prominent"
            tone="accent"
          />
        </View>
        <View style={styles.recordingText}>
          <AppText numberOfLines={1} variant="headline">
            {recordingDisplayName(recording)}
          </AppText>
          <AppText numberOfLines={1} tone="secondary" variant="callout">
            {recordingKind} · {" "}
            {formatRecordingDuration(recordingDurationMs(recording))}
          </AppText>
        </View>
        <Icon name="chevron.right" size="compact" tone="secondary" />
      </Pressable>
    </Link>
  );
}

function EmptyLibrary({ errorMessage }: Readonly<{ errorMessage: string | null }>) {
  return (
    <View style={styles.emptyStateCard}>
      <View style={styles.emptyStateIcon}>
        <Icon name="rectangle.stack" size="prominent" tone="accent" />
      </View>
      <AppText style={styles.emptyTitle} variant="headline">
        {errorMessage ?? "Your takes stay on this iPhone"}
      </AppText>
      <AppText style={styles.supportingCopy} tone="secondary">
        {errorMessage === null
          ? "Record your first take, then return here to watch, rename, share, or save it to Photos."
          : "Pull to refresh, or return to the camera and try again."}
      </AppText>
      <Link href="/" asChild>
        <Pressable accessibilityRole="button" style={styles.primaryAction}>
          <Icon name="camera.fill" size="regular" tone="previewLabel" />
          <AppText tone="previewLabel" variant="headline">
            Open camera
          </AppText>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  centered: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.regular,
    justifyContent: "center",
  },
  listContent: {
    gap: spacing.regular,
    padding: spacing.control,
    paddingBottom: spacing.spacious,
  },
  emptyListContent: { flexGrow: 1, justifyContent: "center" },
  recordingRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.regular,
    minHeight: 88,
    padding: spacing.regular,
    ...shadows.floating,
  },
  pressed: { opacity: 0.7 },
  recordingArtwork: {
    alignItems: "center",
    aspectRatio: 4 / 3,
    backgroundColor: colors.raisedSurface,
    borderRadius: radii.control,
    height: 64,
    justifyContent: "center",
  },
  recordingText: { flex: 1, gap: spacing.compact },
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
  emptyTitle: { textAlign: "center" },
  supportingCopy: { maxWidth: 320, textAlign: "center" },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.small,
    justifyContent: "center",
    marginTop: spacing.section,
    minHeight: 52,
    paddingHorizontal: spacing.control,
    width: "100%",
  },
});
