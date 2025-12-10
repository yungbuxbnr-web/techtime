
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Add resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'cjs', 'mjs'],
  assetExts: config.resolver?.assetExts?.filter((ext) => ext !== 'svg') || [],
};

// Ensure proper handling of node modules
config.resolver.nodeModulesPaths = [
  ...config.resolver.nodeModulesPaths || [],
];

// Add transformer configuration for react-native-reanimated
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
  // Ensure Reanimated plugin is properly handled
  babelTransformerPath: require.resolve('react-native/Libraries/Babel/BabelTransformer'),
};

// Increase watcher timeout for large projects
config.watchFolders = config.watchFolders || [];

module.exports = config;
