import type { ExpoConfig } from "expo/config";

import appJson from "../../app.json";
import appConfig, {
  DEVELOPMENT_ADAPTIVE_BACKGROUND,
  DEVELOPMENT_ICON,
  DEVELOPMENT_ID_SUFFIX,
  DEVELOPMENT_NAME,
  DEVELOPMENT_SCHEME,
  DEVELOPMENT_VARIANT,
  OTA_FLAG,
  VARIANT_FLAG,
} from "../../app.config";
import easJson from "../../eas.json";

declare function require(name: "node:fs"): {
  existsSync(path: string): boolean;
};

// jest runs from the project root, as the app config paths are relative to it
const { existsSync } = require("node:fs");

function resolve(env: Record<string, string | undefined>): ExpoConfig {
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  const apply = (values: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  apply(env);

  try {
    return appConfig({
      config: structuredClone(appJson.expo) as ExpoConfig,
      projectRoot: "",
      staticConfigPath: null,
      packageJsonPath: null,
    });
  } finally {
    apply(previous);
  }
}

describe("development build variant", () => {
  it("keeps the store identity without the variant", () => {
    const config = resolve({ [VARIANT_FLAG]: undefined });

    expect(config.name).toBe(appJson.expo.name);
    expect(config.scheme).toBe(appJson.expo.scheme);
    expect(config.ios?.bundleIdentifier).toBe(appJson.expo.ios.bundleIdentifier);
    expect(config.android?.package).toBe(appJson.expo.android.package);
    expect(config.ios?.icon).toEqual(appJson.expo.ios.icon);
  });

  it("makes a separate app with its own icon for the development variant", () => {
    const config = resolve({ [VARIANT_FLAG]: DEVELOPMENT_VARIANT });

    expect(config.name).toBe(DEVELOPMENT_NAME);
    expect(config.scheme).toBe(DEVELOPMENT_SCHEME);
    expect(config.ios?.bundleIdentifier).toBe(`${appJson.expo.ios.bundleIdentifier}${DEVELOPMENT_ID_SUFFIX}`);
    expect(config.android?.package).toBe(`${appJson.expo.android.package}${DEVELOPMENT_ID_SUFFIX}`);
    expect(config.icon).toBe(DEVELOPMENT_ICON);
    expect(config.ios?.icon).toBe(DEVELOPMENT_ICON);
    expect(config.android?.adaptiveIcon).toMatchObject({
      foregroundImage: appJson.expo.android.adaptiveIcon.foregroundImage,
      backgroundImage: DEVELOPMENT_ADAPTIVE_BACKGROUND,
    });
    expect(config.updates?.enabled).toBe(false);
  });

  it("ships the development icons", () => {
    expect(existsSync(DEVELOPMENT_ICON)).toBe(true);
    expect(existsSync(DEVELOPMENT_ADAPTIVE_BACKGROUND)).toBe(true);
  });

  it("does not change the internal update builds", () => {
    const config = resolve({ [VARIANT_FLAG]: undefined, [OTA_FLAG]: "1" });

    expect(config.ios?.bundleIdentifier).toBe(appJson.expo.ios.bundleIdentifier);
    expect(config.updates?.enabled).toBe(true);
  });

  it("sets the variant only on the development profiles", () => {
    type Profile = { extends?: string; env?: Record<string, string>; developmentClient?: boolean };
    const profiles = easJson.build as Record<string, Profile>;

    expect(profiles.development).toMatchObject({
      developmentClient: true,
      env: { [VARIANT_FLAG]: DEVELOPMENT_VARIANT },
    });
    expect(profiles.simulator?.extends).toBe("development");

    for (const [name, profile] of Object.entries(profiles)) {
      if (name !== "development" && name !== "simulator") {
        expect(profile.extends).not.toBe("development");
        expect(profile.env?.[VARIANT_FLAG]).toBeUndefined();
      }
    }
  });
});
