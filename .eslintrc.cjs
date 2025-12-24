
// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  root: true,
  extends: [
    'expo',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'import'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
  },
  ignorePatterns: [
    '/dist/*', 
    '/public/*', 
    '/babel-plugins/*', 
    'node_modules/', 
    'android/', 
    'ios/', 
    '.expo/',
    '*.config.js',
    '*.config.cjs',
    'plugins/*.cjs',
    'scripts/*.sh',
    'scripts/*.cjs',
  ],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        moduleDirectory: ['node_modules', '.']
      }
    },
    'import/ignore': [
      'node_modules/react-native/index\\.js$'
    ]
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/prefer-as-const': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-wrapper-object-types': 'off',
    'react/no-unescaped-entities': 'off',
    'import/no-unresolved': ['error', {
      ignore: [
        '^react-native$',
        '^react-native/',
        '^@react-native',
        '^expo',
        '^expo-',
        '^@expo/'
      ]
    }],
    'prefer-const': 'off',
    'react/prop-types': 'off',
    'no-case-declarations': 'off',
    'no-empty': 'off',
    'react/display-name': 'off'
  },
  overrides: [
    {
      files: ['metro.config.js', 'metro.config.cjs', 'babel.config.cjs', '*.config.js', '*.config.cjs', 'plugins/*.cjs'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      }
    },
    {
      files: ['scripts/**/*.js', 'scripts/**/*.cjs', 'scripts/**/*.sh'],
      env: { 
        node: true 
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      }
    }
  ]
};
