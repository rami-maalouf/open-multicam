import { BlurView, type BlurTint } from "expo-blur";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { View, type ViewProps } from "react-native";

import { useAccessibilityPreferences } from "@/foundation/accessibility/preferences";
import { materials } from "@/theme";

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
  const token = materials[material];
  const materialStyle = [{ overflow: "hidden" as const }, style];

  if (reduceTransparency) {
    return (
      <View
        {...props}
        style={[
          { backgroundColor: token.fallbackColor, overflow: "hidden" },
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
      intensity={token.blurIntensity}
      style={materialStyle}
      tint={blurTints[material]}
    >
      {children}
    </BlurView>
  );
}
