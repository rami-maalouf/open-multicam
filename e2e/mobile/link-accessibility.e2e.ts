import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";

test.beforeEach(async ({ app, device }) => {
  verifyBuild();
  await device.installApp();
  await app.open();
});

test("support and privacy links expose native link traits and remain navigable", async ({ app, device, screen }) => {
  await device.openLink("openmulticam:///support");
  await screen.swipe({ direction: "down" });
  await expect(screen.getByRole("link", { name: "Get help or report a problem" })).toBeVisible();
  await expect(screen.getByRole("link", { name: "Privacy policy" })).toBeVisible();
  await app.screenshot("support-link-traits");
  await screen.getByRole("link", { name: "Privacy policy" }).tap();
  await expect(screen.getByText("Your recordings stay with you")).toBeVisible();
  await screen.scrollUntilVisible(screen.getByRole("link", { name: "Contact support" }), { direction: "down" });
  await expect(screen.getByRole("link", { name: "Contact support" })).toBeVisible();
  await app.screenshot("privacy-link-traits");
});
