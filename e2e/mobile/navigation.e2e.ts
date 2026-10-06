import { verifyBuild } from "./build-identity";
import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { bundleId, cleanFixtures } from "./library-fixtures";

test.beforeEach(async ({ app, device }) => {
  verifyBuild();
  await device.installApp();
  cleanFixtures();
  await app.open();
});

test("unsupported simulator camera reports its boundary and disables recording", async ({ app, screen }) => {
  await expect(screen.getByRole("image", { name: /No simulator camera source was found/ })).toBeVisible();
  await expect(screen.getByRole("button", { name: "Record" })).toBeDisabled();
  await app.screenshot("unsupported-camera");
});

test("capture navigation opens empty library and returns to camera", async ({ screen }) => {
  await screen.getByLabel("Open library").tap();
  await expect(screen.getByText("Your takes stay on this iPhone")).toBeVisible();
  await screen.getByLabel(/Open camera/).tap();
  await expect(screen.getByLabel("Open settings")).toBeVisible();
});

test("settings opens privacy and keeps its policy readable", async ({ app, screen }) => {
  await screen.getByLabel("Open settings").tap();
  await screen.getByTestId("privacy-settings-row").tap();
  await expect(screen.getByText("Your recordings stay with you")).toBeVisible();
  await screen.swipe({ direction: "down" });
  await expect(screen.getByText("Storage and deletion")).toBeVisible();
  await app.screenshot("privacy-policy");
});

test("support explains optional donation and navigates to privacy without a purchase", async ({ app, device, screen }) => {
  await device.openLink("openmulticam:///support");
  await expect(screen.getByText("Made for your perspective")).toBeVisible();
  await expect(screen.getByText(/Every camera feature is free/)).toBeVisible();
  await screen.swipe({ direction: "down" });
  await screen.getByText("Privacy policy").tap();
  await expect(screen.getByText("Your recordings stay with you")).toBeVisible();
  await app.screenshot("support-to-privacy");
});

for (const permission of ["camera", "microphone"] as const) {
  test(`${permission} denial preserves settings and library access`, async ({ app, device, screen }) => {
    await device.openApp(bundleId, { relaunch: true, permissions: { camera: "grant", microphone: "grant", [permission]: "deny" } });
    await expect(screen.getByLabel("Open settings")).toBeVisible();
    await screen.getByLabel("Open library").tap();
    await expect(screen.getByText("Your takes stay on this iPhone")).toBeVisible();
    await app.screenshot(`${permission}-denied-library`);
  });
}

test("missing recording deep link recovers with an honest unavailable state", async ({ app, device, screen }) => {
  await device.openLink("openmulticam:///library/e2e00000-0000-4000-8000-999999999999");
  await expect(screen.getByText("This take is no longer available.")).toBeVisible();
  await app.screenshot("missing-take");
});
