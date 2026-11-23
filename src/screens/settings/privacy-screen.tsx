import { useObserve } from "expo-observe";
import { Link } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { privacySections, supportUrl } from "@/core/privacy";
import { spacing, useThemedStyles, type ThemeColors } from "@/theme";

export function PrivacyScreen() {
  const styles = useThemedStyles(createStyles);
  const { markInteractive } = useObserve();

  // the policy is bundled text, so the screen is interactive as soon as it renders
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  return (
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" style={styles.screen}>
      {privacySections.map(({ title, body }) => (
        <View key={title} style={styles.section}>
          <AppText accessibilityRole="header" variant="headline">{title}</AppText>
          <AppText tone="secondary" variant="body">{body}</AppText>
        </View>
      ))}
      <Link href={supportUrl} accessibilityRole="link">
        <AppText tone="accent" variant="headline">Contact support</AppText>
      </Link>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.section, gap: spacing.screen, maxWidth: 640, width: "100%", alignSelf: "center" },
  section: { gap: spacing.small },
});
