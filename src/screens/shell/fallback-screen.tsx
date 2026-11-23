import { Image, Pressable, StatusBar, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { radii, spacing, useThemedStyles, type ThemeColors } from "@/theme";

const brandMark = require("../../../assets/brand/mark.png");

type FallbackScreenProps = {
  onRetry: () => void;
};

// shown in place of the whole app after a render error. it uses the capture screen's dark
// overlay, so it reads as part of the app instead of a crash, and it depends on no router or
// screen state that could have caused the error.
export function FallbackScreen({ onRetry }: FallbackScreenProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.screen} testID="fallback-screen">
      <StatusBar barStyle="light-content" />
      <Image
        accessibilityIgnoresInvertColors
        source={brandMark}
        style={styles.brandMark}
      />
      <AppText style={styles.title} tone="previewLabel" variant="title">
        {"Something went\nwrong."}
      </AppText>
      <AppText style={styles.copy} tone="previewSecondary">
        OpenMulticam hit an unexpected problem. Takes you already saved are not affected.
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.retryButton}
      >
        <AppText style={styles.retryLabel} variant="headline">
          Try Again
        </AppText>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: colors.previewChrome,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
  },
  // the mark is 944 by 520, drawn by assets/brand/prism.mjs
  brandMark: {
    height: 60,
    marginBottom: spacing.section,
    width: 110,
  },
  title: { maxWidth: 360, textAlign: "center" },
  copy: { marginTop: spacing.small, maxWidth: 340, textAlign: "center" },
  retryButton: {
    alignItems: "center",
    backgroundColor: colors.previewLabel,
    borderRadius: radii.capsule,
    justifyContent: "center",
    marginTop: spacing.section,
    minHeight: 50,
    paddingHorizontal: spacing.section,
  },
  retryLabel: { color: colors.previewChrome },
});
