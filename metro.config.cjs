
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Use turborepo to restore the cache when possible
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
];

// Increase memory limit for bundling
config.maxWorkers = 2;

// Configure resolver for better module resolution
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'cjs', 'mjs'],
  assetExts: config.resolver?.assetExts || [],
  // Ensure node_modules are resolved correctly
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
};

// Configure transformer for production builds
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    compress: {
      // Disable problematic optimizations that can cause issues
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

// Ensure we handle errors gracefully
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      try {
        return middleware(req, res, next);
      } catch (error) {
        console.error('Metro middleware error:', error);
        next(error);
      }
    };
  },
};

module.exports = config;
