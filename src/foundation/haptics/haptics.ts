import * as Haptics from "expo-haptics";

export type HapticEvent =
  | "selection"
  | "captureReady"
  | "recordingStart"
  | "recordingStop"
  | "success"
  | "warning"
  | "error";

const hapticActions: Record<HapticEvent, () => Promise<void>> = {
  selection: Haptics.selectionAsync,
  captureReady: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  recordingStart: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  recordingStop: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

export type PlayHapticOptions = {
  enabled?: boolean;
};

export async function playHaptic(
  event: HapticEvent,
  { enabled = true }: PlayHapticOptions = {},
): Promise<void> {
  if (!enabled) {
    return;
  }

  try {
    await hapticActions[event]();
  } catch {
    return;
  }
}
