import * as MediaLibrary from "expo-media-library";
import { saveToLibraryAsync } from "expo-media-library/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  TextInput,
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
import { radii, spacing, useThemeColors, useThemedStyles, type ThemeColors } from "@/theme";

export function RecordingDetailScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
  const { recordingSetId } = useLocalSearchParams<{
    recordingSetId: string;
  }>();
  const router = useRouter();
  const [entry, setEntry] = useState<RecordingLibraryEntry | null>(null);
  const [renameDraft, setRenameDraft] = useState<string | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);
  const galleryName = Platform.OS === "android" ? "gallery" : "Photos";
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
    if (Platform.OS === "android") {
      setRenameDraft(entry.name ?? "");
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

  const saveRename = async () => {
    if (entry === null || renameDraft === null || !renameDraft.trim() || renameBusy) return;
    setRenameBusy(true);
    try {
      await multicamCaptureModule.renameRecording(entry.recordingSetId, renameDraft.trim());
      await load();
      setRenameDraft(null);
    } catch {
      Alert.alert("Couldn't rename take", "Your name was kept. Please try again.");
    } finally {
      setRenameBusy(false);
    }
  };

  const share = useCallback(async () => {
    if (entry === null) return;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing unavailable", "Sharing isn't available on this device.");
        return;
      }
      for (const clip of entry.clipUris) {
        await Sharing.shareAsync(clip.uri, { mimeType: "video/mp4", UTI: "public.mpeg-4" });
      }
    } catch {
      Alert.alert("Couldn't share take", "Your videos are still in the library. Please try again.");
    }
  }, [entry]);

  const saveToPhotos = useCallback(async () => {
    if (entry === null) return;
    try {
      if (Platform.OS !== "android" || Number(Platform.Version) < 30) {
        const permission = await MediaLibrary.requestPermissionsAsync(true);
        if (!permission.granted) {
          Alert.alert(
            `${galleryName === "Photos" ? "Photos" : "Gallery"} access is off`,
            Platform.OS === "android"
              ? "Allow storage write access in Settings to save this take."
              : "Allow Add Photos access in Settings to save this take.",
          );
          return;
        }
      }
      for (const clip of entry.clipUris) {
        if (Platform.OS === "android" && Number(Platform.Version) >= 30) {
          await MediaLibrary.Asset.create(clip.uri);
        } else {
          await saveToLibraryAsync(clip.uri);
        }
      }
      await playHaptic("success");
      Alert.alert(`Saved to ${galleryName}`, "Every video in this take was saved.");
    } catch {
      Alert.alert("Couldn't save every video", "Your take is still in the library. Some videos may already have been saved. Please try again.");
    }
  }, [entry, galleryName]);

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
      <Modal visible={renameDraft !== null} transparent animationType="fade" onRequestClose={() => { if (!renameBusy) setRenameDraft(null); }}>
        <View style={styles.dialogBackdrop}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <AppText variant="title">Rename take</AppText>
            <AppText>Choose a name that will stay with this recording.</AppText>
            <TextInput
              accessibilityLabel="Take name"
              autoFocus
              editable={!renameBusy}
              onChangeText={setRenameDraft}
              onSubmitEditing={() => void saveRename()}
              returnKeyType="done"
              style={styles.renameInput}
              value={renameDraft ?? ""}
            />
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" disabled={renameBusy} onPress={() => setRenameDraft(null)} style={styles.dialogButton}>
                <AppText>Cancel</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: renameBusy || !renameDraft?.trim() }} disabled={renameBusy || !renameDraft?.trim()} onPress={() => void saveRename()} style={styles.dialogButton}>
                <AppText tone="accent">{renameBusy ? "Saving…" : "Save"}</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
        <ActionButton icon="photo.badge.arrow.down" label={`Save to ${galleryName}`} onPress={saveToPhotos} />
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
  const styles = useThemedStyles(createStyles);
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  dialogBackdrop: { flex: 1, justifyContent: "center", padding: spacing.section, backgroundColor: "rgba(0,0,0,0.5)" },
  dialog: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.control, gap: spacing.regular },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.regular },
  dialogButton: { minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.regular },
  renameInput: { color: colors.primary, backgroundColor: colors.raisedSurface, borderRadius: radii.small, padding: spacing.regular, fontSize: 17 },
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
    // the height cap narrows the card on tall phones, so keep it centered
    alignSelf: "center",
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
