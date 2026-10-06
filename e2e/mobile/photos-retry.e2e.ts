import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";
import { cleanFixtures, fixtureId, fixtureRoot, seedTake } from "./library-fixtures";
import { revealActions, setPhotosAddPermission } from "./library-actions";
import { photosVideos, photoVideoMetadata } from "./photos-storage";

test.beforeEach(async ({ device }) => { verifyBuild(); await device.installApp(); cleanFixtures(); seedTake("discrete"); });
test.afterEach(() => cleanFixtures());

function exportedVideos(before: Set<string>) {
  return photosVideos().filter((path) => !before.has(path));
}

function exportEvidence(before: Set<string>) {
  const videos = exportedVideos(before).map((path) => ({ path, metadata: photoVideoMetadata(path),
    firstPixel: [...execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path, "-frames:v", "1", "-vf", "scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"])],
  }));
  writeFileSync(`.artifacts/photos-retry-${Date.now()}.json`, JSON.stringify({ videos }, null, 2));
  return videos;
}

test("retry after the second Photos clip fails does not duplicate the completed first clip", async ({ app, device, screen }) => {
  setPhotosAddPermission("grant");
  const before = new Set(photosVideos());
  await app.open();
  await expect(screen.getByLabel("Open library")).toBeVisible();
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await revealActions(screen);
  const second = join(fixtureRoot(), fixtureId, "second.mp4");
  const bytes = readFileSync(second);
  unlinkSync(second);
  try {
    await screen.getByRole("button", { name: /Save to Photos/ }).tap();
    await expect(screen.getByText("Could not save to Photos")).toBeVisible();
    await expect(screen.getByText(/1 of 2 videos were saved/)).toBeVisible();
    await expect.poll(() => exportedVideos(before).length, { timeout: 15000 }).toBe(1);
    await app.screenshot("partial-photos-export");
    exportEvidence(before);
    writeFileSync(second, bytes);
    await screen.getByRole("button", { name: "OK" }).tap();
    await new Promise((resolve) => setTimeout(resolve, 750));
    await screen.getByRole("button", { name: /Save to Photos|Retry saving to Photos/ }).tap();
    await expect(screen.getByText("Saved to Photos")).toBeVisible();
    await screen.getByRole("button", { name: "OK" }).tap();
    await app.screenshot("retried-photos-export");
    const videos = exportEvidence(before);
    expect(videos).toHaveLength(2);
    expect(videos.filter((video) => video.firstPixel[2]! > 200 && video.firstPixel[0]! < 20)).toHaveLength(1);
    expect(videos.filter((video) => video.firstPixel[1]! > 100 && video.firstPixel[0]! < 20)).toHaveLength(1);
  } finally { writeFileSync(second, bytes); }
});

test("a successful two-clip Photos export disables repeat saving for this detail visit", async ({ app, device, screen }) => {
  setPhotosAddPermission("grant");
  const before = new Set(photosVideos());
  await app.open();
  await expect(screen.getByLabel("Open library")).toBeVisible();
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await revealActions(screen);
  await screen.getByRole("button", { name: /Save to Photos/ }).tap();
  await expect(screen.getByText("Saved to Photos")).toBeVisible();
  await screen.getByRole("button", { name: "OK" }).tap();
  await expect.poll(() => exportedVideos(before).length, { timeout: 15000 }).toBe(2);
  await expect(screen.getByRole("button", { name: /Saved to Photos/ })).toBeDisabled();
  expect(exportEvidence(before)).toHaveLength(2);
});
