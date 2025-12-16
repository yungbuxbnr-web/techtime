
module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
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
