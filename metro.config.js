
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add source extensions for better module resolution
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'cjs',
  'mjs'
];

// Filter out svg from asset extensions if needed
config.resolver.assetExts = config.resolver.assetExts.filter(
  ext => ext !== 'svg'
);

module.exports = config;
