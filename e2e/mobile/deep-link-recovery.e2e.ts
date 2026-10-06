import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";

test.beforeEach(async ({ app, device }) => { verifyBuild(); await device.installApp(); await app.open(); });

test("normal settings support navigation returns to settings", async ({ app, screen }) => {
  await screen.getByLabel("Open settings").tap();
  await screen.getByTestId("support-settings-row").tap();
  await expect(screen.getByText("Made for your perspective")).toBeVisible();
  await app.back();
  await expect(screen.getByTestId("support-settings-row")).toBeVisible();
});

test("direct support deep link retains a route back to capture", async ({ app, device, screen }) => {
  await device.openLink("openmulticam:///support");
  await expect(screen.getByText("Made for your perspective")).toBeVisible();
  await app.screenshot("deep-link-support-header");
  await app.back();
  await expect(screen.getByLabel("Open settings")).toBeVisible();
});
