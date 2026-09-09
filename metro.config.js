const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const defaults = config.resolver.blockList ?? [];

// native build caches contain transient lock files that metro must not crawl.
config.resolver.blockList = [
  ...(Array.isArray(defaults) ? defaults : [defaults]),
  /[/\\]\.artifacts[/\\]/,
  /[/\\]coverage[/\\]/,
  /[/\\]dist-validation[/\\]/,
];

module.exports = config;
