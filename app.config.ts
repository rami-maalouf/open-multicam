import type { ConfigContext, ExpoConfig } from "expo/config";

// the development build (the `development` and `simulator` build profiles set this variant) is a
// separate app: its own bundle id, name, scheme and an amber icon, so it installs next to the
// app store or preview app and never looks like it on a home screen.
export const VARIANT_FLAG = "APP_VARIANT";
export const DEVELOPMENT_VARIANT = "development";
export const DEVELOPMENT_ID_SUFFIX = ".dev";
export const DEVELOPMENT_NAME = "Multicam Dev";
export const DEVELOPMENT_SCHEME = "openmulticam-dev";
export const DEVELOPMENT_ICON = "./assets/icon-dev.png";
export const DEVELOPMENT_ADAPTIVE_BACKGROUND = "./assets/adaptive-icon-background-dev.png";
export const DEVELOPMENT_ADAPTIVE_COLOR = "#f58a1f";

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

function withDevelopmentVariant(config: ExpoConfig): ExpoConfig {
  if (process.env[VARIANT_FLAG] !== DEVELOPMENT_VARIANT) {
    return config;
  }

  const bundleIdentifier = config.ios?.bundleIdentifier;
  const androidPackage = config.android?.package;

  if (!bundleIdentifier || !androidPackage) {
    throw new Error(`${VARIANT_FLAG}=${DEVELOPMENT_VARIANT} needs ios.bundleIdentifier and android.package in app.json`);
  }

  return {
    ...config,
    name: DEVELOPMENT_NAME,
    scheme: DEVELOPMENT_SCHEME,
    icon: DEVELOPMENT_ICON,
    ios: {
      ...config.ios,
      bundleIdentifier: `${bundleIdentifier}${DEVELOPMENT_ID_SUFFIX}`,
      icon: DEVELOPMENT_ICON,
    },
    android: {
      ...config.android,
      package: `${androidPackage}${DEVELOPMENT_ID_SUFFIX}`,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        backgroundImage: DEVELOPMENT_ADAPTIVE_BACKGROUND,
        backgroundColor: DEVELOPMENT_ADAPTIVE_COLOR,
      },
    },
  };
}

function withInternalUpdates(config: ExpoConfig): ExpoConfig {
  if (process.env[OTA_FLAG] !== "1") {
    return config;
  }

  const projectId: unknown = config.extra?.eas?.projectId;

  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new Error(`${OTA_FLAG}=1 needs extra.eas.projectId in app.json`);
  }

  return {
    ...config,
    version: OTA_APP_VERSION,
    updates: {
      ...config.updates,
      enabled: true,
      url: `https://u.expo.dev/${projectId}`,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: OTA_LAUNCH_WAIT_MS,
    },
  };
}

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  return withInternalUpdates(withDevelopmentVariant(config as ExpoConfig));
}
