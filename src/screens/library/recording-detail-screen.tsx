import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { multicamCaptureModule } from "../../../modules/multicam-capture";
import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import {
  formatRecordingDuration,
  recordingDisplayName,
  recordingDurationMs,
  type RecordingLibraryEntry,
} from "@/core/library/entry";
import { playHaptic } from "@/foundation/haptics/haptics";
import { colors, radii, spacing } from "@/theme";

export function RecordingDetailScreen() {
  const { recordingSetId } = useLocalSearchParams<{
    recordingSetId: string;
  }>();
  const router = useRouter();
  const [entry, setEntry] = useState<RecordingLibraryEntry | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [selectedClipIndex, setSelectedClipIndex] = useState(0);
  const selectedUri = entry?.clipUris[selectedClipIndex]?.uri ?? null;
  const player = useVideoPlayer(selectedUri, (createdPlayer) => {
    createdPlayer.loop = false;
  });

  const load = useCallback(async () => {
    const recordings = await multicamCaptureModule.listRecordings();
    setEntry(
      recordings.find(
        (recording) => recording.recordingSetId === recordingSetId,
      ) ?? null,
    );
    setLoading(false);
  }, [recordingSetId]);

  useEffect(() => {
    const loadTimer = setTimeout(() => void load(), 0);
    return () => clearTimeout(loadTimer);
  }, [load]);

  const clipLabels = useMemo(() => {
    if (entry === null || entry.mode !== "discrete") {
      return [entry?.cameraA.label ?? "Camera"];
    }
    return [entry.cameraA.label, entry.cameraB.label];
  }, [entry]);

  const rename = useCallback(() => {
    if (entry === null) {
      return;
    }
    Alert.prompt(
      "Rename take",
      "Choose a name that will stay with this recording.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (name?: string) => {
            if (name === undefined || name.trim().length === 0) {
              return;
            }
            void multicamCaptureModule
              .renameRecording(entry.recordingSetId, name)
              .then(load);
          },
        },
      ],
      "plain-text",
      entry.name ?? "",
    );
  }, [entry, load]);

  const share = useCallback(async () => {
    if (entry === null || !(await Sharing.isAvailableAsync())) {
      return;
    }
    for (const clip of entry.clipUris) {
      await Sharing.shareAsync(clip.uri, {
        mimeType: "video/mp4",
        UTI: "public.mpeg-4",
      });
    }
  }, [entry]);

  const saveToPhotos = useCallback(async () => {
    if (entry === null) {
      return;
    }
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      Alert.alert(
        "Photos access is off",
        "Allow Add Photos access in Settings to save this take.",
      );
      return;
    }
    for (const clip of entry.clipUris) {
      await MediaLibrary.saveToLibraryAsync(clip.uri);
    }
    await playHaptic("success");
    Alert.alert("Saved to Photos", "Every video in this take was saved.");
  }, [entry]);

  const confirmDelete = useCallback(() => {
    if (entry === null) {
      return;
    }
    Alert.alert(
      "Delete this take?",
      "This permanently removes every video in the take from OpenMulticam.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void multicamCaptureModule
              .deleteRecording(entry.recordingSetId)
              .then(() => router.replace("/library"));
          },
        },
      ],
    );
  }, [entry, router]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (entry === null || selectedUri === null) {
    return (
      <View style={styles.centered}>
        <Icon name="exclamationmark.triangle" size="prominent" tone="critical" />
        <AppText variant="headline">This take is no longer available.</AppText>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
    >
      <View style={styles.videoCard}>
        <VideoView
          contentFit="contain"
          nativeControls
          player={player}
          style={styles.video}
        />
      </View>

      {entry.clipUris.length > 1 ? (
        <View style={styles.clipPicker}>
          {entry.clipUris.map((clip, index) => (
            <Pressable
              accessibilityRole="button"
              key={clip.clipId}
              onPress={() => {
                player.pause();
                setSelectedClipIndex(index);
              }}
              style={[
                styles.clipButton,
                index === selectedClipIndex && styles.clipButtonSelected,
              ]}
            >
              <AppText
                tone={index === selectedClipIndex ? "previewLabel" : "primary"}
                variant="caption"
              >
                {clipLabels[index]}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <AppText numberOfLines={2} variant="title">
            {recordingDisplayName(entry)}
          </AppText>
          <AppText tone="secondary">
            {formatRecordingDuration(recordingDurationMs(entry))} · {" "}
            {entry.preset.width} × {entry.preset.height} · {entry.preset.frameRate} fps
          </AppText>
        </View>
        <Pressable
          accessibilityLabel="Rename take"
          accessibilityRole="button"
          onPress={rename}
          style={styles.iconButton}
        >
          <Icon name="pencil" tone="accent" />
        </Pressable>
      </View>

      <View style={styles.actionGrid}>
        <ActionButton icon="square.and.arrow.up" label="Share" onPress={share} />
        <ActionButton icon="photo.badge.arrow.down" label="Save to Photos" onPress={saveToPhotos} />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={confirmDelete}
        style={styles.deleteButton}
      >
        <Icon name="trash" tone="critical" />
        <AppText tone="critical" variant="headline">
          Delete take
        </AppText>
      </Pressable>
    </ScrollView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: Readonly<{
  icon: string;
  label: string;
  onPress: () => Promise<void>;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void onPress()}
      style={styles.actionButton}
    >
      <Icon name={icon} tone="accent" />
      <AppText variant="headline">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing.control, padding: spacing.control, paddingBottom: spacing.spacious },
  centered: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.regular,
    justifyContent: "center",
    padding: spacing.control,
  },
  videoCard: {
    aspectRatio: 9 / 16,
    backgroundColor: colors.previewChrome,
    borderRadius: radii.card,
    maxHeight: 560,
    overflow: "hidden",
    width: "100%",
  },
  video: { height: "100%", width: "100%" },
  clipPicker: {
    backgroundColor: colors.raisedSurface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.compact,
    padding: spacing.compact,
  },
  clipButton: {
    alignItems: "center",
    borderRadius: radii.small,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.small,
  },
  clipButtonSelected: { backgroundColor: colors.accent },
  headingRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.regular },
  headingText: { flex: 1, gap: spacing.small },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.capsule,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  actionGrid: { flexDirection: "row", gap: spacing.regular },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flex: 1,
    gap: spacing.small,
    justifyContent: "center",
    minHeight: 84,
    padding: spacing.regular,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.small,
    justifyContent: "center",
    minHeight: 52,
  },
});
