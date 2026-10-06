import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";
import { cleanFixtures, corruptId, seedCorruptTake } from "./library-fixtures";

test("an unreadable direct take shows an actionable error instead of spinning", async ({ app, device, screen }) => {
  verifyBuild();
  await device.installApp();
  cleanFixtures();
  seedCorruptTake();
  try {
    await app.open();
    await expect(screen.getByLabel("Open library")).toBeVisible();
    await device.openLink(`openmulticam:///library/${corruptId}`);
    await expect(screen.getByText("This take could not be read.")).toBeVisible();
    await expect(screen.getByRole("button", { name: "Try Again" })).toBeVisible();
    await app.screenshot("unreadable-detail-recovery");
  } finally { cleanFixtures(); }
});
