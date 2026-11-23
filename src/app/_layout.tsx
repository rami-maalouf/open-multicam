import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { Stack } from "expo-router/stack";
import * as Device from "expo-device";
import { Observe, ObserveRoot } from "expo-observe";
import { useMemo } from "react";
import { useColorScheme } from "react-native";

import { AccessibilityPreferencesProvider } from "@/foundation/accessibility/preferences";
import { holdLaunchScreen } from "@/foundation/launch/launch-screen";
import "@/core/telemetry";
import { FallbackScreen } from "@/screens/shell/fallback-screen";
import { useThemeColors } from "@/theme";

// the app's only expo observe configuration. it runs before any screen mounts, because the
// router integration cannot be turned on later and a second call would replace this one.
// see "expo observe" in AGENTS.md.
Observe.configure({
  // release builds also run on simulators: pull request evidence, expo simulators and the
  // verify build. their own environment keeps those sessions out of the production numbers.
  environment: Device.isDevice ? undefined : "simulator",
  integrations: {
    // a take's id names a recording on this device, so route metrics never carry it
    "expo-router": { filteredParams: ["recordingSetId"] },
  },
});

holdLaunchScreen();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const navigationTheme = useMemo(() => {
    const baseTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: colors.background as string,
        border: colors.separator as string,
        card: colors.surface as string,
        primary: colors.accent as string,
        text: colors.primary as string,
      },
    };
  }, [colorScheme, colors]);

  return (
    <ObserveRoot
      errorBoundaryFallback={({ resetError }) => <FallbackScreen onRetry={resetError} />}
    >
      <AccessibilityPreferencesProvider>
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.background },
              headerBackButtonDisplayMode: "minimal",
              headerShadowVisible: false,
              headerTintColor: colors.primary,
            }}
          >
            <Stack.Screen
              name="index"
              options={{ headerShown: false, title: "Capture" }}
            />
            <Stack.Screen
              name="library/index"
              options={{ headerLargeTitle: true, title: "Library" }}
            />
            <Stack.Screen
              name="library/[recordingSetId]"
              options={{ title: "Take" }}
            />
            <Stack.Screen
              name="settings"
              options={{ headerLargeTitle: true, title: "Settings" }}
            />
            <Stack.Screen
              name="support"
              options={{ title: "Support OpenMulticam" }}
            />
            <Stack.Screen
              name="privacy"
              options={{ title: "Privacy policy" }}
            />
            <Stack.Screen
              name="dev-foundation"
              options={{ title: "Foundation Preview" }}
            />
          </Stack>
        </ThemeProvider>
      </AccessibilityPreferencesProvider>
    </ObserveRoot>
  );
}
