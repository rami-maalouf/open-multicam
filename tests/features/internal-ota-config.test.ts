import type { ExpoConfig } from "expo/config";

import appJson from "../../app.json";
import appConfig, { OTA_FLAG, OTA_LAUNCH_WAIT_MS } from "../../app.config";
import easJson from "../../eas.json";

function resolve(flag: string | undefined): ExpoConfig {
  const previous = process.env[OTA_FLAG];

  if (flag === undefined) {
    delete process.env[OTA_FLAG];
  } else {
    process.env[OTA_FLAG] = flag;
  }

  try {
    return appConfig({
      config: appJson.expo as ExpoConfig,
      projectRoot: "",
      staticConfigPath: null,
      packageJsonPath: null,
    });
  } finally {
    if (previous === undefined) {
      delete process.env[OTA_FLAG];
    } else {
      process.env[OTA_FLAG] = previous;
    }
  }
}

describe("internal over-the-air updates", () => {
  it("keeps updates off without the flag, so store builds make no update request", () => {
    const config = resolve(undefined);

    expect(config.updates?.enabled).toBe(false);
    expect(config.updates?.url).toBeUndefined();
  });

  it("keeps updates off for any value other than 1", () => {
    expect(resolve("true").updates?.enabled).toBe(false);
  });

  it("turns updates on for the project with the flag", () => {
    const config = resolve("1");

    expect(config.updates).toMatchObject({
      enabled: true,
      url: `https://u.expo.dev/${appJson.expo.extra.eas.projectId}`,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: OTA_LAUNCH_WAIT_MS,
    });
  });

  it("sets the flag only on the internal build profile, which uses the internal channel", () => {
    const profiles = easJson.build as Record<
      string,
      { env?: Record<string, string>; channel?: string }
    >;

    expect(profiles["internal-ota"]).toMatchObject({
      channel: "internal",
      env: { [OTA_FLAG]: "1" },
    });

    for (const [name, profile] of Object.entries(profiles)) {
      if (name !== "internal-ota") {
        expect(profile.env?.[OTA_FLAG]).toBeUndefined();
        expect(profile.channel).toBeUndefined();
      }
    }
  });
});
