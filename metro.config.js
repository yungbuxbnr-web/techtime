
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Add resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'cjs'],
  assetExts: config.resolver?.assetExts?.filter((ext) => ext !== 'svg') || [],
};

// Ensure proper handling of node modules
config.resolver.nodeModulesPaths = [
  ...config.resolver.nodeModulesPaths || [],
];

module.exports = config;
