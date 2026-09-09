import { Host, List, ListItem, Text } from "@expo/ui";
import * as Application from "expo-application";
import { router } from "expo-router";

import { colors } from "@/theme";

export { CaptureScreen } from "@/screens/capture/capture-screen";
export { LibraryScreen } from "@/screens/library/library-screen";

export function SettingsScreen() {
  return (
    <Host style={{ flex: 1 }} seedColor={colors.accent} useViewportSizeMeasurement>
      <List>
        <ListItem supportingText="Single camera and supported camera pairs">
          <Text>iPhone capture</Text>
        </ListItem>
        <ListItem supportingText="1080p H.264 at 24, 25, or 30 fps">
          <Text>Recording quality</Text>
        </ListItem>
        <ListItem supportingText="Your recordings stay on your iPhone until you share them" onPress={() => router.push("/privacy")} testID="privacy-settings-row">
          <Text>Privacy policy</Text>
        </ListItem>
        <ListItem supportingText="Optional one-time donation, help, and feedback" onPress={() => router.push("/support")} testID="support-settings-row">
          <Text>Support OpenMulticam</Text>
        </ListItem>
        <ListItem supportingText={Application.nativeApplicationVersion ?? "1.0.0"}>
          <Text>Version</Text>
        </ListItem>
        <ListItem onPress={() => router.push("/library")}>
          <Text>Open library</Text>
        </ListItem>
        <ListItem onPress={() => router.dismissTo("/")}>
          <Text>Return to capture</Text>
        </ListItem>
      </List>
    </Host>
  );
}
