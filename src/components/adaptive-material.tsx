import { BlurView, type BlurTint } from "expo-blur";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { Platform, View, type ViewProps } from "react-native";

import { useAccessibilityPreferences } from "@/foundation/accessibility/preferences";
import { materials, useThemeColors } from "@/theme";

export type MaterialRole = keyof typeof materials;

export type AdaptiveMaterialProps = ViewProps & {
  interactive?: boolean;
  material?: MaterialRole;
};

const blurTints: Record<MaterialRole, BlurTint> = {
  bar: "systemMaterial",
  previewOverlay: "systemUltraThinMaterialDark",
  floatingControl: "systemThinMaterial",
};

export function AdaptiveMaterial({
  children,
  interactive = false,
  material = "bar",
  style,
  ...props
}: AdaptiveMaterialProps) {
  const { reduceTransparency } = useAccessibilityPreferences();
  const colors = useThemeColors();
  // android has no system blur material, so it always uses the themed fallback.
  const fallbackColor = {
    bar: colors.surface,
    previewOverlay: colors.previewChrome,
    floatingControl: colors.raisedSurface,
  }[material];
  const materialStyle = [{ overflow: "hidden" as const }, style];

  if (reduceTransparency || Platform.OS !== "ios") {
    return (
      <View
        {...props}
        style={[
          { backgroundColor: fallbackColor, overflow: "hidden" },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        {...props}
        glassEffectStyle="regular"
        isInteractive={interactive}
        style={materialStyle}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      {...props}
      intensity={materials[material].blurIntensity}
      style={materialStyle}
      tint={blurTints[material]}
    >
      {children}
    </BlurView>
  );
}
