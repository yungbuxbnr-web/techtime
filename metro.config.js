
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure proper module resolution for React Native 0.76+
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  unstable_conditionNames: ['react-native', 'browser', 'require'],
  // Add node_modules to the resolution paths
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  // Ensure proper asset extensions
  assetExts: [
    ...config.resolver.assetExts,
    'db',
    'mp3',
    'ttf',
    'obj',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
  ],
  // Ensure proper source extensions
  sourceExts: [
    ...config.resolver.sourceExts,
    'jsx',
    'js',
    'ts',
    'tsx',
    'json',
    'cjs',
  ],
};

// Disable watchman to prevent file watching issues
config.watchFolders = [];

// Optimize transformer for better performance
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    ecma: 8,
    keep_classnames: true,
    keep_fnames: true,
    module: true,
    mangle: {
      module: true,
      keep_classnames: true,
      keep_fnames: true,
    },
  },
};

// Add better caching
config.cacheStores = [
  ...config.cacheStores || [],
];

module.exports = config;
