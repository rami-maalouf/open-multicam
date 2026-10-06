import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";

test("denied camera opens the isolated app permission pane on physical hardware", async ({ app, device, screen }) => {
  await device.installApp();
  await app.open();
  await expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
  await screen.getByRole("button", { name: "Continue" }).tap();
  await device.alert("dismiss");
  await screen.getByRole("button", { name: "Open Settings" }).tap();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await device.openApp("com.apple.Preferences");
  await expect(screen.getByText("OpenMulticam E2E", { exact: true }).first()).toBeVisible();
  await expect(screen.getByRole("switch", { name: "Camera" })).toBeVisible();
  await app.screenshot("hardware-per-app-camera-settings");
});
