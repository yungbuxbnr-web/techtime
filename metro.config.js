
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

// Get default config with CSS enabled (for react-native-css-interop)
const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Use file-based cache for better performance
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
];

// Optimize worker count for memory efficiency
config.maxWorkers = 2;

// Configure resolver for better module resolution
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'cjs', 'mjs'],
  assetExts: config.resolver?.assetExts || [],
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
};

// Configure transformer for production builds
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    compress: {
      drop_console: false,
      reduce_funcs: false,
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
