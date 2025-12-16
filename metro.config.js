
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

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

// Add node_modules to watch folders
config.watchFolders = [
  path.resolve(__dirname, 'node_modules')
];

// Configure resolver to properly find React Native modules
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules')
];

// Disable require cycle warnings
config.resolver.disableHierarchicalLookup = false;

// Configure transformer
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
