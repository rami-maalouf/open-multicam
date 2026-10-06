const { getDefaultConfig } = require("expo/metro-config");
const { realpathSync } = require("node:fs");
const { join } = require("node:path");

const config = getDefaultConfig(__dirname);
const dependencies = realpathSync(join(__dirname, "node_modules"));
config.watchFolders = [...config.watchFolders, dependencies];
config.resolver.nodeModulesPaths = [dependencies];
const defaults = config.resolver.blockList ?? [];
const root = __dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// exclusions stay inside this generated project and never exclude its parent artifact directory.
config.resolver.blockList = [
  ...(Array.isArray(defaults) ? defaults : [defaults]),
  new RegExp(`${root}[/\\\\](?:\\.artifacts|coverage|dist-validation|ios)[/\\\\]`),
];

module.exports = config;
