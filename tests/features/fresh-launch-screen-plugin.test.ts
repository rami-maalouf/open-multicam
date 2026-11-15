import appJson from "../../app.json";

type LaunchAssetNames = Record<string, string>;

type StoryboardNode = { $: Record<string, string> };

type Storyboard = {
  document: {
    scenes: { scene: { imageView: StoryboardNode[]; color: StoryboardNode[] }[] }[];
    resources: { image: StoryboardNode[]; namedColor: StoryboardNode[] }[];
  };
};

declare const require: {
  (moduleName: "node:fs"): {
    mkdirSync(path: string): void;
    mkdtempSync(prefix: string): string;
    readdirSync(path: string): string[];
    writeFileSync(path: string, data: string): void;
  };
  (moduleName: "node:os"): { tmpdir(): string };
  (moduleName: "node:path"): { join(...segments: string[]): string };
  (moduleName: "../../plugins/with-fresh-launch-screen"): {
    fingerprintLaunchAssets(assetCatalogPath: string): LaunchAssetNames;
    renameLaunchAssetsInStoryboard(storyboard: Storyboard, names: LaunchAssetNames): Storyboard;
  };
};

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  fingerprintLaunchAssets,
  renameLaunchAssetsInStoryboard,
} = require("../../plugins/with-fresh-launch-screen");

function makeAssetCatalog(logoBytes: string, backgroundJson: string) {
  const catalog = fs.mkdtempSync(path.join(os.tmpdir(), "launch-assets-"));
  const logo = path.join(catalog, "SplashScreenLogo.imageset");
  const background = path.join(catalog, "SplashScreenBackground.colorset");

  fs.mkdirSync(logo);
  fs.writeFileSync(path.join(logo, "Contents.json"), "{}");
  fs.writeFileSync(path.join(logo, "image@3x.png"), logoBytes);
  fs.mkdirSync(background);
  fs.writeFileSync(path.join(background, "Contents.json"), backgroundJson);

  return catalog;
}

function storyboardWith(logoName: string, backgroundName: string): Storyboard {
  return {
    document: {
      scenes: [
        {
          scene: [
            {
              imageView: [{ $: { id: "EXPO-SplashScreen", image: logoName } }],
              color: [{ $: { key: "backgroundColor", name: backgroundName } }],
            },
          ],
        },
      ],
      resources: [
        {
          image: [
            { $: { name: "SplashScreenLogo", width: "260" } },
            { $: { name: logoName, width: "260" } },
          ],
          namedColor: [{ $: { name: backgroundName } }],
        },
      ],
    },
  };
}

describe("fresh launch screen plugin", () => {
  it("gives the launch logo and background one name that carries their content hash", () => {
    const catalog = makeAssetCatalog("prism", '{"red":"0.01"}');

    const names = fingerprintLaunchAssets(catalog);

    expect(names.SplashScreenLogo).toMatch(/^SplashScreenLogo-[0-9a-f]{10}$/);
    expect(names.SplashScreenBackground).toBe(
      names.SplashScreenLogo?.replace("SplashScreenLogo", "SplashScreenBackground"),
    );
    expect(fs.readdirSync(catalog).sort()).toEqual([
      `${names.SplashScreenBackground}.colorset`,
      `${names.SplashScreenLogo}.imageset`,
    ]);
  });

  it("renames the assets when the art or the background changes", () => {
    const first = fingerprintLaunchAssets(makeAssetCatalog("prism", "{}"));
    const sameArt = fingerprintLaunchAssets(makeAssetCatalog("prism", "{}"));
    const newArt = fingerprintLaunchAssets(makeAssetCatalog("new prism", "{}"));
    const newBackground = fingerprintLaunchAssets(makeAssetCatalog("prism", '{"red":"1"}'));

    expect(sameArt).toEqual(first);
    expect(newArt.SplashScreenLogo).not.toBe(first.SplashScreenLogo);
    expect(newBackground.SplashScreenLogo).not.toBe(first.SplashScreenLogo);
  });

  it("removes launch assets left by an earlier prebuild so only one copy ships", () => {
    const catalog = makeAssetCatalog("prism", "{}");
    fs.mkdirSync(path.join(catalog, "SplashScreenLogo-0123456789.imageset"));
    fs.mkdirSync(path.join(catalog, "SplashScreenBackground-0123456789.colorset"));
    fs.mkdirSync(path.join(catalog, "AppIcon.appiconset"));

    const names = fingerprintLaunchAssets(catalog);

    expect(fs.readdirSync(catalog).sort()).toEqual([
      "AppIcon.appiconset",
      `${names.SplashScreenBackground}.colorset`,
      `${names.SplashScreenLogo}.imageset`,
    ]);
  });

  it("leaves a catalog without launch assets alone", () => {
    const catalog = fs.mkdtempSync(path.join(os.tmpdir(), "launch-assets-"));

    expect(fingerprintLaunchAssets(catalog)).toEqual({});
  });

  it("points every storyboard reference at the new names and keeps one resource each", () => {
    const names = {
      SplashScreenLogo: "SplashScreenLogo-abcdef0123",
      SplashScreenBackground: "SplashScreenBackground-abcdef0123",
    };
    const storyboard = storyboardWith(
      "SplashScreenLogo-0123456789",
      "SplashScreenBackground",
    );

    const result = renameLaunchAssetsInStoryboard(storyboard, names);
    const scene = result.document.scenes[0]?.scene[0];
    const resources = result.document.resources[0];

    expect(scene?.imageView[0]?.$.image).toBe(names.SplashScreenLogo);
    expect(scene?.color[0]?.$.name).toBe(names.SplashScreenBackground);
    expect(resources?.image).toEqual([
      { $: { name: names.SplashScreenLogo, width: "260" } },
    ]);
    expect(resources?.namedColor).toEqual([
      { $: { name: names.SplashScreenBackground } },
    ]);
  });

  it("runs after expo-splash-screen writes the launch screen", () => {
    const plugins = appJson.expo.plugins.map((plugin) =>
      Array.isArray(plugin) ? plugin[0] : plugin,
    );

    expect(plugins.indexOf("./plugins/with-fresh-launch-screen")).toBeLessThan(
      plugins.indexOf("expo-splash-screen"),
    );
  });
});
