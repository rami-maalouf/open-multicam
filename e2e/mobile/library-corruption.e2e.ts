import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";
import { cleanFixtures, seedTake, seedCorruptTake } from "./library-fixtures";

test.beforeEach(async ({ device }) => { verifyBuild(); await device.installApp(); cleanFixtures(); seedTake(); seedCorruptTake(); });
test.afterEach(() => cleanFixtures());

test("an unreadable take cannot hide a healthy recording", async ({ app, screen }) => {
  await app.open();
  await screen.getByLabel("Open library").tap();
  await expect(screen.getByLabel(/E2E synthetic take/)).toBeVisible();
  await screen.getByLabel(/E2E synthetic take/).tap();
  await expect(screen.getByLabel("Video")).toBeVisible();
  await app.screenshot("healthy-take-beside-corrupt-manifest");
});
