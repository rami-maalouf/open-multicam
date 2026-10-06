import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { revealActions, setPhotosAddPermission } from "./library-actions";
import { verifyBuild } from "./build-identity";
import { cleanFixtures, fixtureId, seedTake } from "./library-fixtures";

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
  await expect(screen.getByLabel("Open library")).toBeVisible({ timeout: 60_000 });
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await revealActions(screen);
  await screen.getByRole("button", { name: /Share/ }).tap();
  await expect(screen.getByTestId("ShareSheet.RemoteContainerView")).toBeVisible();
  await app.screenshot("share-sheet");
  await screen.getByLabel("dismiss popup").tap({ position: { x: 20, y: 100 } });
  await expect(screen.getByTestId("ShareSheet.RemoteContainerView")).not.toBeVisible();
  await expect(screen.getByText("E2E synthetic take")).toBeVisible();
});

test("Photos Add denial gives an actionable error and preserves the take", async ({ app, device, screen }) => {
  setPhotosAddPermission("revoke");
  await app.open();
  await expect(screen.getByLabel("Open library")).toBeVisible({ timeout: 60_000 });
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await revealActions(screen);
  await screen.getByRole("button", { name: /Save to Photos/ }).tap();
  await expect(screen.getByText("Photos access is off")).toBeVisible();
  await screen.getByRole("button", { name: "OK" }).tap();
  await expect(screen.getByText("E2E synthetic take")).toBeVisible();
  await app.screenshot("photos-denied");
});

for (const appearance of ["light", "dark"] as const) {
  test(`${appearance} appearance and landscape preserve library actions`, async ({ app, device, screen }) => {
    await device.setAppearance(appearance);
    await app.open();
  await expect(screen.getByLabel("Open library")).toBeVisible({ timeout: 60_000 });
    await screen.getByLabel("Open library").tap();
    await expect(screen.getByLabel(/E2E synthetic take/)).toBeVisible();
    await app.screenshot(`${appearance}-library`);
    await device.setOrientation("landscape-left");
    await expect(screen.getByLabel(/E2E synthetic take/)).toBeVisible();
    await app.screenshot(`${appearance}-landscape-library`);
  });
}

