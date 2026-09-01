import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { Stack } from "expo-router/stack";
import { useMemo } from "react";
import { useColorScheme } from "react-native";

import { AccessibilityPreferencesProvider } from "@/foundation/accessibility/preferences";
import { colors } from "@/theme";

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
  }, [colorScheme]);

  return (
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
            name="dev-foundation"
            options={{ title: "Foundation Preview" }}
          />
        </Stack>
      </ThemeProvider>
    </AccessibilityPreferencesProvider>
  );
}
