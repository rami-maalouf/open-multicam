import { execFileSync } from "node:child_process";
import type { Screen } from "e2e";
import { expect } from "e2e";
import { fixtureRoot, bundleId } from "./library-fixtures";

export function setPhotosAddPermission(state: "grant" | "revoke") {
  fixtureRoot();
  execFileSync("xcrun", ["simctl", "privacy", process.env.OPENMULTICAM_SIMULATOR_UDID!, state, "photos-add", bundleId]);
}

export async function revealActions(screen: Screen) {
  await expect(screen.getByText("E2E synthetic take")).toBeVisible();
  const heading = await screen.getByText("E2E synthetic take").boundingBox();
  if (!heading) throw new Error("the take heading is not visible");
  await screen.swipe({ from: { x: heading.x + 20, y: heading.y }, to: { x: heading.x + 20, y: 180 } });
}
