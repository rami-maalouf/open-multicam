import { execFileSync } from "node:child_process";
import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";
import { cleanFixtures, fixtureRoot, seedTake } from "./library-fixtures";

function ui(option: string, value: string) {
  fixtureRoot();
  execFileSync("xcrun", ["simctl", "ui", process.env.OPENMULTICAM_SIMULATOR_UDID!, option, value]);
}

test.beforeEach(async ({ device }) => { verifyBuild(); await device.installApp(); cleanFixtures(); seedTake(); });
test.afterEach(() => { cleanFixtures(); ui("content_size", "large"); ui("increase_contrast", "disabled"); });

test("largest accessibility text and increased contrast retain capture and library navigation", async ({ app, screen }) => {
  ui("content_size", "accessibility-extra-extra-extra-large");
  ui("increase_contrast", "enabled");
  await app.open();
  await expect(screen.getByLabel("Open library")).toBeVisible();
  await expect(screen.getByLabel("Open settings")).toBeVisible();
  await expect(screen.getByRole("button", { name: "Record" })).toBeVisible();
  await app.screenshot("largest-text-contrast-capture");
  await screen.getByLabel("Open library").tap();
  await expect(screen.getByLabel(/E2E synthetic take/)).toBeVisible();
  await app.screenshot("largest-text-contrast-library");
  await screen.getByLabel(/E2E synthetic take/).tap();
  await expect(screen.getByLabel("Video")).toBeVisible();
  await app.screenshot("largest-text-contrast-detail");
});
