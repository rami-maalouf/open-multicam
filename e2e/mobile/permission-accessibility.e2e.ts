import { execFileSync } from "node:child_process";
import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { verifyBuild } from "./build-identity";
import { bundleId, fixtureRoot } from "./library-fixtures";

test.beforeEach(async ({ device }) => { verifyBuild(); await device.installApp(); });

test("denied camera keeps the Settings recovery button accessible", async ({ app, device, screen }) => {
  await device.openApp(bundleId, { relaunch: true, permissions: { camera: "deny", microphone: "grant" } });
  await expect(screen.getByRole("image", { name: /Camera access is off/ })).toBeVisible();
  await expect(screen.getByRole("button", { name: "Open Settings" })).toBeVisible();
  await app.screenshot("accessible-permission-recovery");
});

test("fresh camera access keeps the Continue permission action accessible", async ({ app, device, screen }) => {
  await device.openApp(bundleId, { relaunch: true, permissions: { camera: "reset", microphone: "reset" } });
  await expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
  await app.screenshot("accessible-permission-onboarding");
});

test("camera denial opens Settings and recovers after an OS permission grant", async ({ app, device, screen }) => {
  await device.openApp(bundleId, { relaunch: true, permissions: { camera: "reset", microphone: "grant" } });
  await screen.getByRole("button", { name: "Continue" }).tap();
  await device.alert("dismiss");
  await expect(screen.getByRole("image", { name: /Camera access is off/ })).toBeVisible();
  fixtureRoot();
  try { execFileSync("xcrun", ["simctl", "terminate", process.env.OPENMULTICAM_SIMULATOR_UDID!, "com.apple.Preferences"], { stdio: "pipe" }); } catch (error) { if (!String(error).includes("not running")) throw error; }
  await screen.getByRole("button", { name: "Open Settings" }).tap();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  fixtureRoot();
  execFileSync("xcrun", ["simctl", "io", process.env.OPENMULTICAM_SIMULATOR_UDID!, "screenshot", ".artifacts/recovery-settings-foreground.png"]);
  await device.openApp("com.apple.Preferences");
  await expect(screen.getByText("Settings", { exact: true }).first()).toBeVisible();
  await app.screenshot("actual-settings-permission-recovery");
  await device.openApp(bundleId, { relaunch: true, permissions: { camera: "grant", microphone: "grant" } });
  await expect(screen.getByRole("image", { name: /No simulator camera source/ })).toBeVisible();
  await expect(screen.getByRole("image", { name: /Camera access is off/ })).not.toBeVisible();
  await expect(screen.getByLabel("Open library")).toBeVisible();
});

test("camera and microphone grants leave permission onboarding", async ({ app, device, screen }) => {
  await device.openApp(bundleId, { relaunch: true, permissions: { camera: "reset", microphone: "reset" } });
  await screen.getByRole("button", { name: "Continue" }).tap();
  await device.alert("accept");
  await device.alert("accept");
  await expect(screen.getByRole("button", { name: "Continue" })).not.toBeVisible();
  await expect(screen.getByRole("image", { name: /No simulator camera source/ })).toBeVisible();
  await app.screenshot("actual-camera-microphone-grants");
});
