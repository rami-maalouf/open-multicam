const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const defaults = config.resolver.blockList ?? [];

// native build caches contain transient lock files that metro must not crawl.
config.resolver.blockList = [
  ...(Array.isArray(defaults) ? defaults : [defaults]),
  /[/\\]\.artifacts[/\\]/,
  /[/\\]coverage[/\\]/,
  /[/\\]dist-validation[/\\]/,
  // expo's env watcher matches custom env names that its transformer cannot parse.
  /[/\\]\.env\.(?!(?:local|development|production)(?:\.local)?$)[^/\\]+$/,
];

module.exports = config;
