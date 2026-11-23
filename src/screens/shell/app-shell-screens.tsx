import { FieldGroup, Host, ListItem, Text } from "@expo/ui";
import * as Application from "expo-application";
import { useObserve } from "expo-observe";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { Icon } from "@/components/icon";
import { useThemeColors } from "@/theme";

export { CaptureScreen } from "@/screens/capture/capture-screen";
export { LibraryScreen } from "@/screens/library/library-screen";

type SettingsRowProps = {
  detail?: string;
  onPress?: () => void;
  testID?: string;
  title: string;
};

// @expo/ui 57 colors an ios row's supporting text with the name "secondaryLabel", which
// swiftui cannot resolve, so the detail line renders in the primary label color and the rows
// read as one block. ios rows pass the theme's secondary color instead. android rows keep
// material's own supporting color.
function SettingsRow({ detail, onPress, testID, title }: SettingsRowProps) {
  const colors = useThemeColors();

  return (
    <ListItem
      colors={{ containerColor: "transparent" }}
      onPress={onPress}
      testID={testID}
      trailing={onPress && <Icon name="chevron.right" size="compact" tone="secondary" />}
    >
      <Text>{title}</Text>
      {detail === undefined ? null : (
        <ListItem.Supporting>
          <Text
            textStyle={Platform.OS === "ios" ? { color: colors.secondary as string } : undefined}
            testID={testID === undefined ? undefined : `${testID}-detail`}
          >
            {detail}
          </Text>
        </ListItem.Supporting>
      )}
    </ListItem>
  );
}

export function SettingsScreen() {
  const colors = useThemeColors();
  const { markInteractive } = useObserve();

  // every row is static, so the screen is interactive as soon as it renders
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  return (
    <Host style={{ flex: 1 }} seedColor={colors.accent} useViewportSizeMeasurement>
      <FieldGroup>
        <FieldGroup.Section title="Capture">
          <SettingsRow detail="Single camera and supported camera pairs" title="Camera capture" />
          <SettingsRow detail="1080p H.264 at 24, 25, or 30 fps" title="Recording quality" />
        </FieldGroup.Section>
        <FieldGroup.Section title="About">
          <SettingsRow
            detail="Your recordings stay on your device until you share them"
            onPress={() => router.push("/privacy")}
            testID="privacy-settings-row"
            title="Privacy policy"
          />
          <SettingsRow
            detail="Optional one-time donation, help, and feedback"
            onPress={() => router.push("/support")}
            testID="support-settings-row"
            title="Support OpenMulticam"
          />
          <SettingsRow
            detail={Application.nativeApplicationVersion ?? "1.0.0"}
            testID="version-settings-row"
            title="Version"
          />
        </FieldGroup.Section>
        <FieldGroup.Section>
          <SettingsRow onPress={() => router.push("/library")} title="Open library" />
          <SettingsRow onPress={() => router.dismissTo("/")} title="Return to capture" />
      </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
