
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure proper resolution of React Native modules
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
  ],
};

// Add watchFolders to ensure Metro watches the correct directories
config.watchFolders = [
  path.resolve(__dirname),
];

module.exports = config;
