const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { withMod } = require("expo/config-plugins");

// ios caches the launch screen it draws for an app by asset name, not by asset content. after
// an update that changes the splash art but keeps the names expo-splash-screen uses
// (SplashScreenLogo, SplashScreenBackground), the system keeps showing the old art until the
// device restarts, and then the expo splash view fades the new art in over it: two different
// launch screens. this plugin gives both assets a name that carries a hash of their content, so
// new art always gets a new name and ios has nothing stale to reuse.
//
// list this plugin before expo-splash-screen in app.json. expo runs a mod added earlier after
// the ones added later, so this rename runs after expo-splash-screen has written the assets and
// the storyboard. expo-splash-screen adds the storyboard provider, and no storyboard mod can be
// added after it, so the wrong order fails the prebuild instead of shipping a broken launch image.

const launchAssets = [
  { baseName: "SplashScreenLogo", extension: "imageset" },
  { baseName: "SplashScreenBackground", extension: "colorset" },
];

const fingerprintLength = 10;

// the mod that expo-splash-screen uses to read and write ios/<app>/SplashScreen.storyboard
const storyboardMod = "splashScreenStoryboard";

function listFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    })
    .sort();
}

function fingerprintDirectories(directories) {
  const hash = crypto.createHash("sha256");

  for (const directory of directories) {
    for (const filePath of listFiles(directory)) {
      hash.update(path.relative(path.dirname(directory), filePath));
      hash.update("\0");
      hash.update(fs.readFileSync(filePath));
      hash.update("\0");
    }
  }

  return hash.digest("hex").slice(0, fingerprintLength);
}

function isLaunchAssetName(name, baseName) {
  return name === baseName || new RegExp(`^${baseName}-[0-9a-f]+$`).test(name);
}

// renames the generated launch asset sets in place and returns the old-to-new name map.
// sets from an earlier prebuild are removed first, so only one copy of each ships.
function fingerprintLaunchAssets(assetCatalogPath) {
  for (const entry of fs.readdirSync(assetCatalogPath)) {
    for (const { baseName, extension } of launchAssets) {
      const name = path.basename(entry, `.${extension}`);

      if (entry.endsWith(`.${extension}`) && name !== baseName && isLaunchAssetName(name, baseName)) {
        fs.rmSync(path.join(assetCatalogPath, entry), { recursive: true, force: true });
      }
    }
  }

  const present = launchAssets
    .map((asset) => ({
      ...asset,
      directory: path.join(assetCatalogPath, `${asset.baseName}.${asset.extension}`),
    }))
    .filter(({ directory }) => fs.existsSync(directory));

  if (present.length === 0) {
    return {};
  }

  const fingerprint = fingerprintDirectories(present.map(({ directory }) => directory));
  const names = {};

  for (const { baseName, extension, directory } of present) {
    const fingerprintedName = `${baseName}-${fingerprint}`;
    fs.renameSync(directory, path.join(assetCatalogPath, `${fingerprintedName}.${extension}`));
    names[baseName] = fingerprintedName;
  }

  return names;
}

function renameAttributes(node, names) {
  if (Array.isArray(node)) {
    node.forEach((child) => renameAttributes(child, names));
    return;
  }

  if (node === null || typeof node !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "$") {
      for (const attribute of ["image", "name"]) {
        const current = value[attribute];

        for (const [baseName, fingerprintedName] of Object.entries(names)) {
          if (typeof current === "string" && isLaunchAssetName(current, baseName)) {
            value[attribute] = fingerprintedName;
          }
        }
      }
    } else {
      renameAttributes(value, names);
    }
  }
}

function dedupeByName(entries) {
  if (!Array.isArray(entries)) {
    return entries;
  }

  const seen = new Set();

  return entries.filter((entry) => {
    const name = entry?.$?.name;

    if (name === undefined || !seen.has(name)) {
      seen.add(name);
      return true;
    }

    return false;
  });
}

// points every storyboard reference to a launch asset at its fingerprinted name
function renameLaunchAssetsInStoryboard(storyboard, names) {
  renameAttributes(storyboard, names);

  for (const resources of storyboard?.document?.resources ?? []) {
    resources.image = dedupeByName(resources.image);
    resources.namedColor = dedupeByName(resources.namedColor);
  }

  return storyboard;
}

function withFreshLaunchScreen(config) {
  return withMod(config, {
    platform: "ios",
    mod: storyboardMod,
    action: (modConfig) => {
      const { introspect, platformProjectRoot, projectName } = modConfig.modRequest;

      // introspection only reads the config and must not touch the native project
      if (introspect) {
        return modConfig;
      }

      const names = fingerprintLaunchAssets(
        path.join(platformProjectRoot, projectName, "Images.xcassets"),
      );
      modConfig.modResults = renameLaunchAssetsInStoryboard(modConfig.modResults, names);

      return modConfig;
    },
  });
}

module.exports = withFreshLaunchScreen;
module.exports.fingerprintLaunchAssets = fingerprintLaunchAssets;
module.exports.renameLaunchAssetsInStoryboard = renameLaunchAssetsInStoryboard;
