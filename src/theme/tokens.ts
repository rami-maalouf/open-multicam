import { Appearance, DynamicColorIOS, Platform, type ColorValue, type TextStyle } from "react-native";

export type ThemeAppearance = "light" | "dark";
export type ThemeContrast = "standard" | "high";

const standardLightPalette = {
  background: "#f2f2f7",
  surface: "#ffffff",
  raisedSurface: "#e9e9ee",
  label: "#19191b",
  secondaryLabel: "#56565e",
  separator: "#c6c6cc",
  accent: "#245ac0",
  accentSecondary: "#d84832",
  critical: "#b3261e",
  success: "#18794e",
  previewChrome: "#09090a",
  previewLabel: "#f8fcfd",
  previewSecondaryLabel: "#b7c4c8",
  previewSeparator: "#58666a",
  recording: "#ff453a",
} as const;

export type ThemeColorRole = keyof typeof standardLightPalette;
export type ThemePalette = Record<ThemeColorRole, string>;

export const themePalettes = {
  light: {
    standard: standardLightPalette,
    high: {
      background: "#ffffff",
      surface: "#ffffff",
      raisedSurface: "#e4e2dc",
      label: "#000000",
      secondaryLabel: "#303b3e",
      separator: "#697579",
      accent: "#004f57",
      accentSecondary: "#a82217",
      critical: "#8c0b05",
      success: "#075c36",
      previewChrome: "#000000",
      previewLabel: "#ffffff",
      previewSecondaryLabel: "#d9e1e3",
      previewSeparator: "#8d9a9e",
      recording: "#e92e20",
    },
  },
  dark: {
    standard: {
      background: "#101012",
      surface: "#1c1c1e",
      raisedSurface: "#2c2c2e",
      label: "#f5f5f7",
      secondaryLabel: "#b3b3bc",
      separator: "#414145",
      accent: "#94baff",
      accentSecondary: "#ff7865",
      critical: "#ff6b60",
      success: "#4fd195",
      previewChrome: "#09090a",
      previewLabel: "#f7fbfc",
      previewSecondaryLabel: "#aebbbf",
      previewSeparator: "#536166",
      recording: "#ff453a",
    },
    high: {
      background: "#000000",
      surface: "#101012",
      raisedSurface: "#131c1f",
      label: "#ffffff",
      secondaryLabel: "#d5dfe1",
      separator: "#758287",
      accent: "#78eff8",
      accentSecondary: "#ff9a89",
      critical: "#ff8f86",
      success: "#75f0b2",
      previewChrome: "#000000",
      previewLabel: "#ffffff",
      previewSecondaryLabel: "#e2e9eb",
      previewSeparator: "#9aa7ab",
      recording: "#ff6f5e",
    },
  },
} as const satisfies Record<
  ThemeAppearance,
  Record<ThemeContrast, ThemePalette>
>;

export function resolveThemePalette(
  appearance: ThemeAppearance,
  contrast: ThemeContrast,
): ThemePalette {
  return themePalettes[appearance][contrast];
}

function adaptiveColor(role: ThemeColorRole): ColorValue {
  if (Platform.OS !== "ios") {
    return themePalettes[Appearance.getColorScheme() === "dark" ? "dark" : "light"].standard[role];
  }
  return DynamicColorIOS({
    light: themePalettes.light.standard[role],
    dark: themePalettes.dark.standard[role],
    highContrastLight: themePalettes.light.high[role],
    highContrastDark: themePalettes.dark.high[role],
  });
}

export const colors = {
  background: adaptiveColor("background"),
  surface: adaptiveColor("surface"),
  raisedSurface: adaptiveColor("raisedSurface"),
  primary: adaptiveColor("label"),
  secondary: adaptiveColor("secondaryLabel"),
  separator: adaptiveColor("separator"),
  accent: adaptiveColor("accent"),
  accentSecondary: adaptiveColor("accentSecondary"),
  critical: adaptiveColor("critical"),
  success: adaptiveColor("success"),
  previewChrome: adaptiveColor("previewChrome"),
  previewLabel: adaptiveColor("previewLabel"),
  previewSecondary: adaptiveColor("previewSecondaryLabel"),
  previewSeparator: adaptiveColor("previewSeparator"),
  recording: adaptiveColor("recording"),
} as const;

export const spacing = {
  hairline: 1,
  compact: 4,
  small: 8,
  regular: 12,
  control: 16,
  section: 24,
  screen: 32,
  spacious: 48,
} as const;

export const radii = {
  small: 8,
  control: 12,
  card: 18,
  floating: 24,
  capsule: 999,
} as const;

export const typography = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700",
    letterSpacing: 0.37,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: 0.36,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "400",
    letterSpacing: -0.32,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: -0.08,
  },
  timer: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0.18,
    fontVariant: ["tabular-nums"],
  },
} as const satisfies Record<string, TextStyle>;

export const iconSizes = {
  compact: 16,
  regular: 20,
  control: 24,
  prominent: 32,
} as const;

export const materials = {
  bar: {
    blurIntensity: 72,
    fallbackColor: colors.surface,
  },
  previewOverlay: {
    blurIntensity: 64,
    fallbackColor: colors.previewChrome,
  },
  floatingControl: {
    blurIntensity: 80,
    fallbackColor: colors.raisedSurface,
  },
} as const;

export const motion = {
  instant: 0,
  quick: 120,
  standard: 220,
  emphasis: 360,
  spring: {
    damping: 24,
    stiffness: 260,
    mass: 0.8,
  },
} as const;

export const shadows = {
  floating: {
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
} as const;
