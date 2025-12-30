
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure proper module resolution for Android
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
  },
  // Ensure proper platform extensions for Android
  sourceExts: [
    'expo.ts',
    'expo.tsx',
    'expo.js',
    'expo.jsx',
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'wasm',
    'svg',
  ],
  assetExts: [
    'glb',
    'gltf',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'bmp',
    'tiff',
    'svg',
    'ttf',
    'otf',
    'woff',
    'woff2',
    'eot',
    'mp4',
    'webm',
    'wav',
    'mp3',
    'm4a',
    'aac',
    'oga',
    'pdf',
  ],
};

// Ensure proper watching
config.watchFolders = [
  path.resolve(__dirname),
  path.resolve(__dirname, 'node_modules'),
];

// Optimize transformer for Android
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
  // Enable Hermes bytecode for Android
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
};

// Optimize caching for faster builds
config.cacheStores = [
  ...config.cacheStores || [],
];

// Optimize server configuration
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
