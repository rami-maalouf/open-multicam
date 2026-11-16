import type { ConfigContext, ExpoConfig } from "expo/config";

// over-the-air updates are on only for internal testflight builds (the `internal-ota`
// and `verify-simulator` build profiles and the verify-update workflow set this flag). the app store build keeps
// `updates.enabled: false` from app.json, so it makes no update request at launch.
// see docs/internal-updates.md.
export const OTA_FLAG = "OPENMULTICAM_OTA";

// a new update waits this long at launch, so it shows on the first cold launch.
export const OTA_LAUNCH_WAIT_MS = 5000;

// internal builds have their own version line. apple closes a version for new builds when
// it is approved, so the internal builds must not share the app store version in app.json.
// a minor version above the store line stays open while the store ships patch releases.
// the runtime version follows it (appVersion policy), so builds and updates match.
export const OTA_APP_VERSION = "1.1.0";

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const expoConfig = config as ExpoConfig;

  if (process.env[OTA_FLAG] !== "1") {
    return expoConfig;
  }

  const projectId: unknown = expoConfig.extra?.eas?.projectId;

  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new Error(`${OTA_FLAG}=1 needs extra.eas.projectId in app.json`);
  }

  return {
    ...expoConfig,
    version: OTA_APP_VERSION,
    updates: {
      ...expoConfig.updates,
      enabled: true,
      url: `https://u.expo.dev/${projectId}`,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: OTA_LAUNCH_WAIT_MS,
    },
  };
}
