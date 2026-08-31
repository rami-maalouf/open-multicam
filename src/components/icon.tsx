import { Image, type ImageProps } from "expo-image";

import { colors, iconSizes } from "@/theme";

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
  const dimension = iconSizes[size];
  const accessible = label !== undefined;

  return (
    <Image
      {...props}
      accessibilityLabel={label}
      accessibilityRole={accessible ? "image" : undefined}
      accessible={accessible}
      contentFit="contain"
      source={`sf:${name}`}
      style={[{ height: dimension, width: dimension }, style]}
      tintColor={colors[tone] as string}
    />
  );
}
