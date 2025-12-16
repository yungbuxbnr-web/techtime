
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper source extensions
config.resolver.sourceExts = [
  'js',
  'jsx',
  'json',
  'ts',
  'tsx',
  'cjs',
  'mjs'
];

// Configure asset extensions
config.resolver.assetExts = config.resolver.assetExts.filter(
  ext => ext !== 'svg'
);

module.exports = config;
