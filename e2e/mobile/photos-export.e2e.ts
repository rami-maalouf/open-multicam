import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";
import { cleanFixtures, fixtureId, seedTake } from "./library-fixtures";
import { revealActions, setPhotosAddPermission } from "./library-actions";
import { photosVideos, photoVideoMetadata } from "./photos-storage";

test.beforeEach(async ({ device }) => { verifyBuild(); await device.installApp(); cleanFixtures(); seedTake(); });
test.afterEach(() => cleanFixtures());

test("Photos export creates a playable synthetic video in isolated Photos storage", async ({ app, device, screen }) => {
  setPhotosAddPermission("grant");
  const before = new Set(photosVideos());
  await app.open();
  await expect(screen.getByLabel("Open library")).toBeVisible();
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await revealActions(screen);
  await screen.getByRole("button", { name: /Save to Photos/ }).tap();
  await expect(screen.getByText("Saved to Photos")).toBeVisible();
  await app.screenshot("saved-synthetic-to-photos");
  await screen.getByRole("button", { name: "OK" }).tap();
  await expect.poll(() => photosVideos().filter((path) => !before.has(path)).length, { timeout: 15000 }).toBe(1);
  const path = photosVideos().find((candidate) => !before.has(candidate));
  if (!path) throw new Error("the synthetic video is absent from Photos storage");
  const metadata = photoVideoMetadata(path);
  expect(metadata.streams[0]).toEqual({ codec_name: "h264", width: 1080, height: 1920 });
  expect(Number(metadata.format.duration)).toBe(60);
});
