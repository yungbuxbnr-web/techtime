
module.exports = function (api) {
  api.cache(true);
  
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const isProduction = NODE_ENV === 'production';
  
  return {
    presets: [
      ['babel-preset-expo', { 
        jsxRuntime: 'automatic',
        lazyImports: true
      }]
    ],
    plugins: [
      '@babel/plugin-proposal-export-namespace-from',
      [
        'babel-plugin-module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
          ],
        },
      ],
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
