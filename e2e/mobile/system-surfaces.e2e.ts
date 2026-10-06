import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";
import { bundleId, cleanFixtures, fixtureId, seedTake } from "./library-fixtures";

test.beforeEach(async ({ device }) => {
  verifyBuild();
  await device.installApp();
  cleanFixtures();
  seedTake();
});

test.afterEach(async ({ device }) => {
  cleanFixtures();
  await device.setAppearance("light");
  await device.setOrientation("portrait");
});

test("share opens a native sheet and cancels without sending", async ({ app, device, screen }) => {
  await app.open();
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await screen.swipe({ direction: "down" });
  await screen.getByRole("button", { name: /Share/ }).tap();
  await expect(screen.getByRole("button", { name: "Copy" })).toBeVisible();
  await app.screenshot("share-sheet");
  await screen.getByRole("button", { name: "Close" }).tap();
  await expect(screen.getByText("E2E synthetic take")).toBeVisible();
});

test("Photos export requests add access and saves the synthetic video", async ({ app, device, screen }) => {
  await app.open();
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await screen.swipe({ direction: "down" });
  await screen.getByRole("button", { name: /Save to Photos/ }).tap();
  const allow = screen.getByRole("button", { name: /^Allow/ });
  if (await allow.count()) await allow.tap();
  await expect(screen.getByText("Saved to Photos")).toBeVisible();
  await app.screenshot("saved-synthetic-to-photos");
  await screen.getByRole("button", { name: "OK" }).tap();
});

test("Photos denial gives an actionable error and preserves the take", async ({ app, device, screen }) => {
  await device.openApp(bundleId, { relaunch: true, permissions: { photos: "deny", camera: "grant", microphone: "grant" } });
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await screen.swipe({ direction: "down" });
  await screen.getByRole("button", { name: /Save to Photos/ }).tap();
  const deny = screen.getByRole("button", { name: "Don’t Allow" });
  if (await deny.count()) await deny.tap();
  await expect(screen.getByText("Photos access is off")).toBeVisible();
  await screen.getByRole("button", { name: "OK" }).tap();
  await expect(screen.getByText("E2E synthetic take")).toBeVisible();
  await app.screenshot("photos-denied");
});

for (const appearance of ["light", "dark"] as const) {
  test(`${appearance} appearance and landscape preserve library actions`, async ({ app, device, screen }) => {
    await device.setAppearance(appearance);
    await app.open();
    await screen.getByLabel("Open library").tap();
    await expect(screen.getByLabel(/E2E synthetic take/)).toBeVisible();
    await app.screenshot(`${appearance}-library`);
    await device.setOrientation("landscape-left");
    await expect(screen.getByLabel(/E2E synthetic take/)).toBeVisible();
    await app.screenshot(`${appearance}-landscape-library`);
  });
}
