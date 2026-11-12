import { Image, type ImageProps } from "expo-image";
import { Platform } from "react-native";

import { androidIconSource } from "@/components/icon-sources";
import { iconSizes, useThemeColors } from "@/theme";

export type IconTone =
  | "primary"
  | "secondary"
  | "accent"
  | "accentSecondary"
  | "critical"
  | "success"
  | "previewLabel"
  | "previewSecondary"
  | "recording";
export type IconSize = keyof typeof iconSizes;

export type IconProps = Omit<
  ImageProps,
  | "accessibilityLabel"
  | "accessibilityRole"
  | "accessible"
  | "contentFit"
  | "source"
  | "tintColor"
> & {
  label?: string;
  name: string;
  size?: IconSize;
  tone?: IconTone;
};

export function Icon({
  label,
  name,
  size = "regular",
  style,
  tone = "primary",
  ...props
}: IconProps) {
  const colors = useThemeColors();
  const dimension = iconSizes[size];
  const accessible = label !== undefined;

  return (
    <Image
      {...props}
      accessibilityLabel={label}
      accessibilityRole={accessible ? "image" : undefined}
      accessible={accessible}
      contentFit="contain"
      source={Platform.OS === "ios" ? `sf:${name}` : androidIconSource(name)}
      style={[{ height: dimension, width: dimension }, style]}
      tintColor={colors[tone] as string}
    />
  );
}
