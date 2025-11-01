
# New Architecture Build Guide

This guide explains how to build the TechTime app with the New Architecture and Hermes enabled on both Android and iOS.

## Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- EAS CLI installed (`npm install -g eas-cli`)
- For iOS: Xcode 14+ and CocoaPods
- For Android: Android Studio with SDK 36, NDK 27.1, CMake 3.22.1

## Configuration Summary

### ✅ New Architecture Enabled
- **app.json**: `"newArchEnabled": true`
- **Android gradle.properties**: `newArchEnabled=true`
- **iOS Podfile**: `ENV['RCT_NEW_ARCH_ENABLED'] = '1'`

### ✅ Hermes Enabled
- **app.json**: `"jsEngine": "hermes"` for both iOS and Android
- **Android gradle.properties**: `hermesEnabled=true`
- **iOS Podfile**: `$RN_HERMES_ENABLED = true`

### ✅ NODE_ENV Fixed
- **.env**: `NODE_ENV=production`
- **eas.json**: `NODE_ENV=production` in all build profiles
- **Android Gradle**: `tasks.configureEach { it.environment("NODE_ENV", "production") }`

### ✅ Toolchain Versions
- **Gradle**: 8.14.x (managed by wrapper)
- **AGP**: 8.5.0
- **Kotlin**: 2.1.0
- **NDK**: 27.1.10909125
- **CMake**: 3.22.1
- **compileSdk**: 36
- **targetSdk**: 36

## Build Steps

### 1. Clean Previous Builds

```bash
# Remove old build artifacts
rm -rf android/.gradle android/build ios/Pods ios/build

# Clean node modules (optional but recommended)
rm -rf node_modules
npm install
```

### 2. iOS Build

```bash
# Navigate to iOS directory
cd ios

# Install pods with repo update
pod install --repo-update

# Return to root
cd ..

# Build with EAS
eas build --platform ios --profile production
```

### 3. Android Build

```bash
# Ensure NODE_ENV is set
export NODE_ENV=production

# Build with EAS
eas build --platform android --profile production
```

### 4. Local Android Build (Optional)

```bash
# Prebuild Android native code
expo prebuild -p android --clean

# Navigate to Android directory
cd android

# Build release AAB
./gradlew :app:bundleRelease

# Or build APK
./gradlew :app:assembleRelease
```

## Troubleshooting

### React Native Reanimated Error

If you see `assertNewArchitectureEnabledTask` error:

1. Ensure `newArchEnabled=true` in `android/gradle.properties`
2. Verify `react-native-reanimated` version is compatible (4.1.0 works with Expo 54)
3. Clean build: `rm -rf android/.gradle android/build`

### NODE_ENV Error

If you see "The NODE_ENV environment variable is required but was not specified":

1. Verify `.env` file exists with `NODE_ENV=production`
2. Check `eas.json` has `NODE_ENV` in env section
3. For local builds, export before building: `export NODE_ENV=production`

### Hermes Not Enabled

If Hermes is not being used:

1. Check `app.json` has `"jsEngine": "hermes"` for both platforms
2. Verify `hermesEnabled=true` in `android/gradle.properties`
3. Verify `$RN_HERMES_ENABLED = true` in `ios/Podfile`
4. Run `pod install --repo-update` after changes

### Memory Issues

If you encounter OutOfMemoryError during build:

1. Increase JVM memory in `gradle.properties`:
   ```
   org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m
   ```
2. Reduce worker processes: `org.gradle.workers.max=2`
3. Limit ABIs in `app/build.gradle`: `abiFilters "arm64-v8a", "armeabi-v7a"`

### iOS Pod Install Issues

If pod install fails:

1. Update CocoaPods: `sudo gem install cocoapods`
2. Clear pod cache: `pod cache clean --all`
3. Remove Podfile.lock: `rm ios/Podfile.lock`
4. Try again: `cd ios && pod install --repo-update`

## Verification

After successful build:

- **Android**: Check `android/app/build/outputs/bundle/release/app-release.aab`
- **iOS**: IPA will be available in EAS build dashboard

### Verify New Architecture

In your app logs, you should see:
- "Fabric enabled: true" (New Architecture)
- "Hermes enabled: true"

### Verify Hermes

Check the bundle:
- Android: Look for `index.android.bundle.hbc` (Hermes bytecode)
- iOS: Check for Hermes in build logs

## Next Steps

1. Test the app thoroughly on both platforms
2. Verify all features work with New Architecture
3. Check performance improvements
4. Submit to app stores when ready

## Additional Resources

- [React Native New Architecture](https://reactnative.dev/docs/new-architecture-intro)
- [Hermes Documentation](https://hermesengine.dev/)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
