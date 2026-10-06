import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { recordingProof } from "./recording-proof";

const modes = ["single", "discrete", "pip", "split"] as const;

test("fresh isolated hardware app requests permissions and keeps library empty", async ({ app, device, screen }) => {
  await device.installApp();
  await app.open();
  const continueButton = screen.getByRole("button", { name: "Continue" });
  if (await continueButton.count()) {
    await continueButton.tap();
    const allow = screen.getByRole("button", { name: /^Allow$|^OK$/ });
    if (await allow.count()) await allow.tap();
    if (await allow.count()) await allow.tap();
  }
  await expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
  await screen.getByLabel("Open library").tap();
  await expect(screen.getByText("Your takes stay on this iPhone")).toBeVisible();
  await screen.getByLabel(/Open camera/).tap();
  await app.screenshot("hardware-preview-ready");
});

for (const mode of modes) {
  test(`${mode} hardware capture finalizes a new take and deletes only that take`, async ({ app, screen }) => {
    await app.open();
    await screen.getByLabel("Open library").tap();
    await expect(screen.getByText("Your takes stay on this iPhone")).toBeVisible();
    await screen.getByLabel(/Open camera/).tap();
    await screen.getByRole("button", { name: /^Cameras:/ }).tap();
    await screen.getByTestId(`camera-sheet-style-${mode}`).tap();
    await expect(screen.getByTestId("camera-sheet")).not.toBeVisible();
    await expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    await screen.getByRole("button", { name: "Record" }).tap();
    await expect(screen.getByRole("button", { name: "Stop recording" })).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await app.screenshot(`hardware-${mode}-recording`);
    await screen.getByRole("button", { name: "Stop recording" }).tap();
    await expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    await screen.getByLabel("Open library").tap();
    await expect.poll(() => screen.getByRole("link").count()).toBe(1);
    await screen.getByRole("link").tap();
    await expect(screen.getByLabel("Video")).toBeVisible();
    await expect(screen.getByText(/1080 × 1920|1920 × 1080/)).toBeVisible();
    await app.screenshot(`hardware-${mode}-finalized`);
    const proof = recordingProof(mode);
    expect(proof.manifest.clips.length).toBe(mode === "discrete" ? 2 : 1);
    for (const clip of proof.clips) {
      const video = clip.streams.find((stream: { codec_type: string }) => stream.codec_type === "video");
      expect(video.codec_name).toBe("h264");
      expect(Math.min(video.width, video.height)).toBe(1080);
      expect(Math.max(video.width, video.height)).toBe(1920);
      expect(Number(clip.format.duration)).toBeGreaterThanOrEqual(2);
    }
    const heading = await screen.getByRole("button", { name: "Rename take" }).boundingBox();
    if (!heading) throw new Error("new take actions are not visible");
    await screen.swipe({ from: { x: heading.x, y: heading.y + heading.height }, to: { x: heading.x, y: 220 } });
    await screen.scrollUntilVisible(screen.getByRole("button", { name: /Delete take/ }));
    await screen.getByRole("button", { name: /Delete take/ }).tap();
    await screen.getByRole("button", { name: "Delete" }).tap();
    await expect(screen.getByText("Your takes stay on this iPhone")).toBeVisible();
    await screen.getByLabel(/Open camera/).tap();
  });
}
