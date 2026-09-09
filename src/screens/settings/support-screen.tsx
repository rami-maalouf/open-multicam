import { Button, Column, Host } from "@expo/ui";
import { Link } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, ScrollView, StyleSheet, View } from "react-native";

import tipJar, { type TipJarStatus } from "../../../modules/tip-jar";
import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import { supportUrl } from "@/core/privacy";
import { colors, radii, spacing } from "@/theme";

export function SupportScreen() {
  const [status, setStatus] = useState<TipJarStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const active = useRef(true);
  const operationRunning = useRef(false);

  const refresh = useCallback(() => {
    return tipJar.getStatus().then((next) => {
      if (active.current) {
        setStatus(next);
        setMessage(next.available || next.hasSupported ? null : "Donations are temporarily unavailable. You can still use every camera feature.");
      }
    }).catch(() => {
      if (active.current) setMessage("Couldn't connect to the App Store. Please try again when you're online.");
    }).finally(() => {
      if (active.current) setBusy(false);
    });
  }, []);

  useEffect(() => {
    active.current = true;
    void refresh();
    const transactions = tipJar.addListener("onChange", () => { void refresh(); });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active" && !operationRunning.current) void refresh();
    });
    return () => {
      active.current = false;
      transactions.remove();
      foreground.remove();
    };
  }, [refresh]);

  const run = async (action: "purchase" | "restore") => {
    if (operationRunning.current) return;
    operationRunning.current = true;
    setBusy(true);
    setMessage(null);
    try {
      if (action === "restore") {
        const restored = await tipJar.restore();
        if (active.current) {
          setStatus(restored);
          setMessage(restored.hasSupported ? null : "No previous donation was found for this Apple Account.");
        }
      } else {
        const result = await tipJar.purchase();
        if (active.current && result === "purchased") {
          setStatus((current) => ({ available: current?.available ?? true, displayPrice: current?.displayPrice, hasSupported: true }));
        } else if (active.current && result === "pending") {
          setMessage("Your donation is awaiting approval from Apple. Thank you for your support.");
        }
      }
    } catch {
      if (active.current) setMessage("The App Store couldn't complete this request. Please try again. You can restore a previous donation using Restore Purchase.");
    } finally {
      operationRunning.current = false;
      if (active.current) setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" style={styles.screen}>
      <View style={styles.intro}>
        <Icon name="heart.fill" tone="accent" size="prominent" />
        <AppText accessibilityRole="header" variant="title">Made for your perspective</AppText>
        <AppText tone="secondary" variant="body">
          {"I built OpenMulticam to make recording from two perspectives simple and accessible. If it's useful to you, an optional donation helps me keep improving it."}
        </AppText>
        <AppText tone="secondary" variant="body">Thank you for using it. - Rami</AppText>
      </View>
      <View style={styles.card}>
        <AppText accessibilityRole="header" variant="headline">
          {status?.hasSupported ? "Thank you for your support" : "Support OpenMulticam"}
        </AppText>
        <AppText tone="secondary" variant="body">
          {status?.hasSupported ? "Your donation is restored on this Apple Account. I'm grateful you chose to support the app." : "A one-time donation, billed by Apple. Every camera feature is free, whether you donate or not. There is no subscription."}
        </AppText>
        {!status?.hasSupported && (
          <Host matchContents seedColor={colors.accent}>
            <Column>
              <Button
                testID="donate-button"
                disabled={busy}
                label={busy ? "Connecting to App Store…" : status?.available && status.displayPrice ? `Donate ${status.displayPrice}` : "Retry App Store"}
                onPress={() => {
                  if (status?.available && status.displayPrice) void run("purchase");
                  else { setBusy(true); void refresh(); }
                }}
              />
              <Button testID="restore-donation-button" disabled={busy} label="Restore Purchase" variant="text" onPress={() => { void run("restore"); }} />
            </Column>
          </Host>
        )}
        {message !== null && <AppText accessibilityLiveRegion="polite" tone="secondary" variant="callout">{message}</AppText>}
      </View>
      <Link href={supportUrl} accessibilityRole="link">
        <AppText tone="accent" variant="headline">Get help or report a problem</AppText>
      </Link>
      <Link href="/privacy" accessibilityRole="link">
        <AppText tone="accent" variant="callout">Privacy policy</AppText>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.control, gap: spacing.spacious },
  intro: { gap: spacing.regular, paddingTop: spacing.regular },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.control, gap: spacing.regular },
});
