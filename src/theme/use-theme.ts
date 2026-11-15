import { useMemo } from "react";
import { Platform, useColorScheme } from "react-native";

import { useAccessibilityPreferences } from "@/foundation/accessibility/preferences";
import { colors, resolveThemePalette } from "./tokens";

export type ThemeColors = typeof colors;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  const { increaseContrast } = useAccessibilityPreferences();
  return useMemo(() => {
    if (Platform.OS === "ios") return colors;
    const palette = resolveThemePalette(scheme === "dark" ? "dark" : "light", increaseContrast ? "high" : "standard");
    return {
      background: palette.background, surface: palette.surface, raisedSurface: palette.raisedSurface,
      primary: palette.label, secondary: palette.secondaryLabel, separator: palette.separator,
      accent: palette.accent, accentSecondary: palette.accentSecondary, critical: palette.critical,
      success: palette.success, previewChrome: palette.previewChrome, previewLabel: palette.previewLabel,
      previewSecondary: palette.previewSecondaryLabel, previewSeparator: palette.previewSeparator,
      recording: palette.recording,
    };
  }, [scheme, increaseContrast]);
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const themeColors = useThemeColors();
  return useMemo(() => factory(themeColors), [factory, themeColors]);
}
