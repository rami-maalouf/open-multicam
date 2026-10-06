import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";
import { fixtureRoot } from "./library-fixtures";

test("reduce motion retains capture, settings and library navigation", async ({ app, device, screen }) => {
  verifyBuild();
  fixtureRoot();
  await device.installApp();
  const settings = async () => {
    await device.openApp("com.apple.Preferences");
    await device.openLink("App-prefs:ACCESSIBILITY&path=MOTION", { app: "com.apple.Preferences" });
    await expect(screen.getByRole("switch", { name: "Reduce Motion" })).toBeVisible();
  };
  await settings();
  const toggle = screen.getByRole("switch", { name: /^[01]$/ }).first();
  const wasOff = await screen.getByRole("switch", { name: "0" }).first().boundingBox();
  const first = await toggle.boundingBox();
  const changed = !!(wasOff && first && wasOff.y === first.y);
  if (changed) await toggle.tap();
  await expect(toggle).toHaveText("1");
  try {
    await app.open();
    await screen.getByLabel("Open settings").tap();
    await expect(screen.getByText("Privacy policy")).toBeVisible();
    await app.back();
    await screen.getByLabel("Open library").tap();
    await expect(screen.getByLabel(/Open camera/)).toBeVisible();
    await screen.getByLabel(/Open camera/).tap();
    await expect(screen.getByRole("button", { name: "Record" })).toBeVisible();
    await app.screenshot("reduce-motion-navigation");
  } finally {
    if (changed) { await settings(); await toggle.tap(); await expect(toggle).toHaveText("0"); }
  }
});
