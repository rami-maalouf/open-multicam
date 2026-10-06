import { Link, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Pressable } from "react-native";

import { AppText, type AppTextVariant } from "@/components/app-text";

export function AppLink({ children, href, variant }: Readonly<{
  children: ReactNode;
  href: Href;
  variant: AppTextVariant;
}>) {
  return (
    <Link asChild href={href}>
      <Pressable accessibilityRole="link">
        <AppText accessibilityRole="text" tone="accent" variant={variant}>{children}</AppText>
      </Pressable>
    </Link>
  );
}
