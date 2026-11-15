import { Image, type ImageProps } from "expo-image";
import { Platform } from "react-native";

import { androidIconSource, type IconName } from "@/components/icon-sources";
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
  name: IconName;
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

  // an sf symbol names itself to voiceover ("rectangle.inset.filled", "forward"), and a row
  // reads its children's names as its own label, so an icon without a label is hidden from
  // assistive technology instead of adding the symbol name to the row
  return (
    <Image
      {...props}
      accessibilityElementsHidden={!accessible}
      accessibilityLabel={label}
      accessibilityRole={accessible ? "image" : undefined}
      accessible={accessible}
      importantForAccessibility={accessible ? "auto" : "no-hide-descendants"}
      contentFit="contain"
      source={Platform.OS === "ios" ? `sf:${name}` : androidIconSource(name)}
      style={[{ height: dimension, width: dimension }, style]}
      tintColor={colors[tone] as string}
    />
  );
}
