import { Text, type TextProps } from "react-native";

import { colors, typography } from "@/theme";

export type AppTextVariant = keyof typeof typography;
export type AppTextTone =
  | "primary"
  | "secondary"
  | "accent"
  | "critical"
  | "success"
  | "previewLabel"
  | "previewSecondary"
  | "recording";

export type AppTextProps = TextProps & {
  tone?: AppTextTone;
  variant?: AppTextVariant;
};

const defaultAccessibilityRoles: Partial<
  Record<AppTextVariant, TextProps["accessibilityRole"]>
> = {
  largeTitle: "header",
  title: "header",
  headline: "header",
};

export function AppText({
  accessibilityRole,
  allowFontScaling = true,
  style,
  tone = "primary",
  variant = "body",
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      accessibilityRole={accessibilityRole ?? defaultAccessibilityRoles[variant]}
      allowFontScaling={allowFontScaling}
      style={[typography[variant], { color: colors[tone] }, style]}
    />
  );
}
