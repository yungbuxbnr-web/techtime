
# Quick Build Reference

## Prerequisites Check

```bash
# Verify versions
node --version        # Should be 20.x
java -version         # Should be 17
pod --version         # Should be 1.15+ (macOS only)
eas --version         # Latest

# Login to Expo
eas login
```

## Build Commands

### Android

```bash
# Production (AAB for Play Store)
npm run build:android

# Preview (APK for testing)
npm run build:preview:android

# Check build status
eas build:list
```

### iOS

```bash
# Production (for App Store)
npm run build:ios

# Preview (for TestFlight)
npm run build:preview:ios

# Check build status
eas build:list
```

### Both Platforms

```bash
# Build both at once
npm run build:all
```

## Configuration Summary

### Android
- **Package**: com.buxrug.techtime
- **Min SDK**: 23 (Android 6.0)
- **Target SDK**: 34 (Android 14)
- **Java**: 17
- **Gradle**: 8.7+
- **Kotlin**: 1.9.24
- **Memory**: 4GB JVM, 2GB Kotlin daemon
- **Lint**: Disabled for release builds

### iOS
- **Bundle ID**: com.buxrug.techtime
- **Deployment Target**: 13.4
- **Xcode**: 16
- **iOS SDK**: 18
- **CocoaPods**: 1.15+
- **Hermes**: Enabled
- **iCloud**: Disabled

## Troubleshooting Quick Fixes

### Android: Out of Memory
```bash
# Build with cache clearing
eas build --platform android --clear-cache
```

### Android: Lint Errors
Already disabled in configuration. If issues persist:
```bash
# Rebuild from scratch
npx expo prebuild -p android --clean
```

### iOS: Code Signing
```bash
# Verify bundle identifier
grep bundleIdentifier app.json

# Manage credentials
eas credentials

# Rebuild
eas build --platform ios --clear-cache
```

### iOS: Pod Install Fails
```bash
cd ios
pod cache clean --all
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

## File Locations

### Configuration Files
- `app.json` - Main Expo configuration
- `eas.json` - EAS Build configuration
- `android-config-templates/` - Android build templates
- `ios-config-templates/` - iOS build templates

### Build Outputs (Local Builds)
- Android AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Android APK: `android/app/build/outputs/apk/release/app-release.apk`
- iOS Archive: Built through Xcode

## Common Issues

| Issue | Solution |
|-------|----------|
| KSP Metaspace OOM | Already configured with 1024MB metaspace |
| LintVital failures | Already disabled in app/build.gradle |
| iOS Exit 65 | Verify bundle ID matches com.buxrug.techtime |
| Pod install fails | Clear cache: `pod cache clean --all` |
| Build timeout | Use `--clear-cache` flag |
| Large assets | Optimize images, remove unused files |

## Asset Optimization

```bash
# Find large files
find assets -type f -size +10M -exec ls -lh {} \;

# Check total size
du -sh assets/
```

## Submission

```bash
# Android to Play Store
npm run submit:android

# iOS to App Store
npm run submit:ios
```

## Environment Variables

Set in EAS Secrets (if needed):
```bash
eas secret:create --scope project --name KEYSTORE_PASSWORD --value your_password
eas secret:create --scope project --name KEY_ALIAS --value your_alias
eas secret:create --scope project --name KEY_PASSWORD --value your_key_password
```

## Build Status

```bash
# List all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]

# Cancel build
eas build:cancel [BUILD_ID]
```

## Support

- Expo Docs: https://docs.expo.dev/
- EAS Build: https://docs.expo.dev/build/introduction/
- React Native: https://reactnative.dev/

## Key Points

✅ **Android**: Memory optimized, lint disabled, Java 17
✅ **iOS**: Bundle ID correct, iCloud removed, deployment target 13.4
✅ **Both**: Latest EAS image, Hermes enabled, auto-increment
✅ **Assets**: Optimize images >10MB
✅ **Signing**: Managed by EAS (or configure manually)
