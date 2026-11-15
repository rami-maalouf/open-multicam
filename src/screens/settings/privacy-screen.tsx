import { Link } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { privacySections, supportUrl } from "@/core/privacy";
import { spacing, useThemedStyles, type ThemeColors } from "@/theme";

export function PrivacyScreen() {
  const styles = useThemedStyles(createStyles);
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
  content: { padding: spacing.control, gap: spacing.spacious },
  section: { gap: spacing.small },
});
