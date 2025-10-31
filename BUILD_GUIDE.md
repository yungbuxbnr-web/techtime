
# TechTime Build Guide

This guide provides step-by-step instructions for building TechTime for both Android and iOS platforms.

## Prerequisites

### Required Software Versions

- **Node.js**: 20.x LTS
- **Java**: 17 (OpenJDK 17)
- **Gradle**: 8.7+ (managed by wrapper)
- **Android Gradle Plugin**: 8.5+
- **Kotlin**: 1.9.24
- **Xcode**: 16.x (for iOS builds)
- **iOS SDK**: 18.x
- **CocoaPods**: ≥1.15
- **EAS CLI**: Latest version

### Installation

```bash
# Install Node.js 20 LTS
# Download from https://nodejs.org/

# Install Java 17
# macOS: brew install openjdk@17
# Linux: sudo apt install openjdk-17-jdk
# Windows: Download from https://adoptium.net/

# Install EAS CLI
npm install -g eas-cli

# Install CocoaPods (macOS only)
sudo gem install cocoapods

# Login to Expo
eas login
```

## Project Setup

```bash
# Install dependencies
npm install

# Configure EAS
eas build:configure
```

## Android Build

### Configuration Files

The Android build uses the following configuration:

#### gradle.properties
- JVM memory: 4GB (-Xmx4g)
- Metaspace: 1024MB
- Kotlin daemon: 2GB
- Incremental builds enabled
- Worker processes limited to 2

#### app/build.gradle
- Compile SDK: 34
- Min SDK: 23
- Target SDK: 34
- Java 17 compatibility
- Lint checks disabled for release builds
- ABI filters: arm64-v8a, armeabi-v7a

### Build Commands

```bash
# Development build
eas build --platform android --profile development

# Preview build (APK)
eas build --platform android --profile preview

# Production build (AAB)
eas build --platform android --profile production
```

### Local Android Build (if needed)

```bash
# Generate native Android project
npx expo prebuild -p android

# Navigate to android directory
cd android

# Clean build
./gradlew clean

# Build release AAB
./gradlew :app:bundleRelease

# Build release APK
./gradlew :app:assembleRelease
```

### Troubleshooting Android

#### KSP Metaspace OutOfMemory Error
- Increase memory in `gradle.properties`
- Reduce worker processes
- Limit ABI filters to arm64-v8a only

#### LintVital Failures
- Lint checks are disabled in `app/build.gradle`
- If issues persist, add specific lint disables

#### Build Timeout
- Increase EAS build timeout in `eas.json`
- Use `--clear-cache` flag

## iOS Build

### Configuration

#### Bundle Identifier
- **Production**: com.buxrug.techtime
- Ensure this matches your App Store Connect configuration

#### Deployment Target
- Minimum: iOS 13.4
- Configured in `app.json` and `Podfile`

#### Entitlements
- iCloud: Removed (unless specifically needed)
- Push Notifications: Removed (unless specifically needed)
- Associated Domains: Removed (unless specifically needed)

### Build Commands

```bash
# Development build
eas build --platform ios --profile development

# Preview build
eas build --platform ios --profile preview

# Production build (App Store)
eas build --platform ios --profile production
```

### Local iOS Build (if needed)

```bash
# Generate native iOS project
npx expo prebuild -p ios

# Navigate to ios directory
cd ios

# Install pods
pod install --repo-update

# Open in Xcode
open techtime.xcworkspace

# Build from Xcode:
# 1. Select "Any iOS Device" as target
# 2. Product > Archive
# 3. Distribute App > App Store Connect
```

### Troubleshooting iOS

#### Exit 65 Code Sign Issues
1. Verify bundle identifier matches: `com.buxrug.techtime`
2. Check provisioning profile on App Store Connect
3. Ensure certificate is valid and matches Team ID
4. Remove unused capabilities (iCloud, Push, etc.)

#### Provisioning Profile Mismatch
1. Go to App Store Connect
2. Navigate to Certificates, Identifiers & Profiles
3. Verify App ID matches `com.buxrug.techtime`
4. Regenerate provisioning profile if needed
5. Download and install in Xcode

#### Pod Install Failures
```bash
# Clear pod cache
pod cache clean --all

# Remove Pods and Podfile.lock
rm -rf Pods Podfile.lock

# Reinstall
pod install --repo-update
```

## Asset Optimization

### Large Assets (>100 MB)
- Compress images using tools like ImageOptim
- Use WebP format for better compression
- Remove unused assets from `assets/` directory

### Asset Audit
```bash
# Find large files
find assets -type f -size +10M -exec ls -lh {} \;

# Total assets size
du -sh assets/
```

## Build Verification

### Android Verification
```bash
# Check AAB file
bundletool build-apks --bundle=app-release.aab --output=app.apks

# Install on device
bundletool install-apks --apks=app.apks
```

### iOS Verification
1. Download IPA from EAS Build
2. Upload to TestFlight
3. Test on physical device

## CI/CD Configuration

### EAS Build Configuration

The `eas.json` file is configured with:
- Latest build image
- Auto-increment build numbers
- Proper build types (AAB for Android, Archive for iOS)

### Environment Variables

Set these in EAS Secrets:
```bash
# Android signing (if using custom keystore)
KEYSTORE_PASSWORD=your_password
KEY_ALIAS=your_alias
KEY_PASSWORD=your_key_password

# iOS signing (handled by EAS)
# No manual configuration needed
```

## Common Issues

### Build Fails with "Out of Memory"
1. Increase memory in `gradle.properties`
2. Reduce worker processes to 1
3. Limit ABI filters to arm64-v8a only

### iOS Build Fails with Code Signing
1. Verify bundle identifier
2. Check provisioning profile
3. Remove unused entitlements
4. Ensure certificate is valid

### Build Takes Too Long
1. Enable Gradle caching
2. Use incremental builds
3. Reduce ABI filters
4. Clear build cache if corrupted

## Support

For additional help:
- Expo Documentation: https://docs.expo.dev/
- EAS Build: https://docs.expo.dev/build/introduction/
- React Native: https://reactnative.dev/

## Checklist

### Before Building

- [ ] Node.js 20 installed
- [ ] Java 17 installed
- [ ] EAS CLI installed and logged in
- [ ] Dependencies installed (`npm install`)
- [ ] Bundle identifier verified
- [ ] Signing certificates configured
- [ ] Large assets optimized

### Android Build

- [ ] `gradle.properties` configured with memory settings
- [ ] `app/build.gradle` has lint disabled
- [ ] Java 17 compatibility set
- [ ] ABI filters configured
- [ ] Build completes successfully
- [ ] AAB file generated

### iOS Build

- [ ] Bundle identifier matches `com.buxrug.techtime`
- [ ] Deployment target set to 13.4
- [ ] Unused entitlements removed
- [ ] Provisioning profile valid
- [ ] CocoaPods installed
- [ ] Build completes successfully
- [ ] IPA file generated

## Next Steps

After successful builds:
1. Test on physical devices
2. Upload to TestFlight (iOS) / Internal Testing (Android)
3. Gather feedback
4. Submit to App Store / Play Store
