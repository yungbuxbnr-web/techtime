# TechTime

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.

## Build Fixes

This project includes several automated build fixes for React Native 0.81+ and Expo 54:

### C++ Build Fix (NEW)

If you encounter C++ build errors like "ninja: build stopped" or "C++ build system [build] failed":

```bash
pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

See `README_CPP_FIX.md` or `QUICK_FIX_CPP_BUILD.md` for details.

### Other Build Fixes

- **FBJNI Fix**: Resolves duplicate fbjni class errors
- **Reanimated Fix**: Fixes React Native Reanimated build issues
- **Gradle Fix**: Configures Gradle for optimal builds

All fixes run automatically during `pnpm install` and `expo prebuild`.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build for Android
npx expo prebuild --clean
pnpm run android

# Build for iOS
npx expo prebuild --clean
pnpm run ios
```

## Troubleshooting

See `BUILD_TROUBLESHOOTING.md` for common build issues and solutions.
