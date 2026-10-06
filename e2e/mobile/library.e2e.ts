import { verifyBuild } from "./build-identity";
import { playbackSample, playbackColorSample } from "./playback-proof";
import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { cleanFixtures, fixtureId, seedTake } from "./library-fixtures";

test.beforeEach(async ({ device }) => {
  verifyBuild();
  await device.installApp();
  cleanFixtures();
});

test.afterEach(async () => cleanFixtures());

for (const mode of ["single", "discrete", "pip", "split"] as const) {
  test(`${mode} native library take opens playable detail and actions`, async ({ app, device, screen }) => {
    seedTake(mode);
    await app.open();
    await screen.getByLabel("Open library").tap();
    await screen.getByLabel(/E2E synthetic take/).tap();
    await expect(screen.getByText("E2E synthetic take")).toBeVisible();
    const video = screen.getByLabel("Video");
    const application = screen.getByLabel("OpenMulticam");
    const paused = await playbackSample(video, application, mode);
    await video.tap();
    await expect.poll(() => playbackSample(video, application, mode), { timeout: 10_000, interval: 650 }).not.toBe(paused);
    await app.screenshot(`${mode}-playing`);
    await video.tap();
    const stopped = await playbackSample(video, application, mode);
    for (let sample = 0; sample < 3; sample++) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      expect(await playbackSample(video, application, mode)).toBe(stopped);
    }
    await app.screenshot(`${mode}-paused`);
    if (mode === "discrete") {
      await screen.getByRole("button", { name: "Front" }).tap();
      await expect(screen.getByLabel("Video")).toBeVisible();
      await expect.poll(async () => {
        const [red, green, blue] = await playbackColorSample(video, application, "front-blue");
        return blue! > 60 && red! < 40 && blue! > green! * 2;
      }, { timeout: 15000, interval: 650 }).toBe(true);
      await app.screenshot("front-track-blue");
    }
    await app.screenshot(`${mode}-detail`);
    await screen.swipe({ direction: "down" });
    await expect(screen.getByRole("button", { name: /Share/ })).toBeVisible();
    await expect(screen.getByRole("button", { name: /Save to Photos/ })).toBeVisible();
    await device.openLink(`openmulticam:///library/${fixtureId}`);
  });
}

test("rename persists after relaunch and delete cancellation preserves the take", async ({ app, device, screen }) => {
  seedTake();
  await app.open();
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await screen.swipe({ direction: "down" });
  await screen.getByRole("button", { name: "Rename take" }).tap();
  await screen.getByRole("textbox").fill("Renamed E2E take");
  await screen.getByRole("button", { name: "Save" }).tap();
  await expect(screen.getByText("Renamed E2E take")).toBeVisible();
  await app.restart();
  await device.openLink(`openmulticam:///library/${fixtureId}`);
  await screen.swipe({ direction: "down" });
  await expect(screen.getByText("Renamed E2E take")).toBeVisible();
  const heading = await screen.getByText("Renamed E2E take").boundingBox();
  if (!heading) throw new Error("recording heading is not visible");
  await screen.swipe({ from: { x: heading.x + heading.width / 2, y: heading.y + heading.height / 2 }, to: { x: heading.x + heading.width / 2, y: 220 } });
  await screen.scrollUntilVisible(screen.getByRole("button", { name: /Delete take/ }));
  await screen.getByRole("button", { name: /Delete take/ }).tap();
  await screen.getByRole("button", { name: "Cancel" }).tap();
  await expect(screen.getByText("Renamed E2E take")).toBeVisible();
  await screen.getByRole("button", { name: /Delete take/ }).tap();
  await screen.getByRole("button", { name: "Delete" }).tap();
  await expect(screen.getByText("Your takes stay on this iPhone")).toBeVisible();
  await app.screenshot("deleted-synthetic-take");
});
