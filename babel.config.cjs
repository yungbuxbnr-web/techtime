
module.exports = function (api) {
  api.cache(true);
  
  // Ensure NODE_ENV is set with a safe default
  const NODE_ENV = process.env.NODE_ENV || 'production';
  const isProduction = NODE_ENV === 'production';
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-proposal-export-namespace-from',
      'babel-plugin-module-resolver',
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
