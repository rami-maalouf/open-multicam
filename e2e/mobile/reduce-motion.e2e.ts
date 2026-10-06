import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";
import { fixtureRoot } from "./library-fixtures";

test("reduce motion retains capture, settings and library navigation", async ({ app, device, screen }) => {
  verifyBuild();
  fixtureRoot();
  await device.installApp();
  const settings = async () => {
    await device.openApp("com.apple.Preferences", { relaunch: true });
    await screen.getByRole("listitem", { name: "Accessibility" }).tap();
    await screen.getByRole("listitem", { name: "Motion" }).tap();
    await expect(screen.getByRole("switch", { name: "Reduce Motion" })).toBeVisible();
  };
  await settings();
  const toggle = screen.getByRole("switch", { name: "Reduce Motion" });
  const changed = await device.locator("id=REDUCE_MOTION role=Switch value=0").count() === 1;
  const tapSwitch = async () => screen.getByRole("switch").nth(1).tap();
  if (changed) await tapSwitch();
  await expect(toggle).toBeChecked();
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
    if (changed) { await settings(); await tapSwitch(); await expect(toggle).not.toBeChecked(); }
  }
});
