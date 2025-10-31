
# TechTime Setup Instructions

## Quick Start

Follow these steps to set up your development environment and build the TechTime app.

## 1. Environment Setup

### Install Node.js 20 LTS

**macOS:**
```bash
brew install node@20
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download and install from https://nodejs.org/

Verify installation:
```bash
node --version  # Should show v20.x.x
npm --version
```

### Install Java 17

**macOS:**
```bash
brew install openjdk@17
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

**Linux:**
```bash
sudo apt update
sudo apt install openjdk-17-jdk
```

**Windows:**
Download from https://adoptium.net/temurin/releases/?version=17

Verify installation:
```bash
java -version  # Should show version 17
```

Set JAVA_HOME:
```bash
# macOS/Linux (add to ~/.bashrc or ~/.zshrc)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Windows
# Set in System Environment Variables
```

### Install CocoaPods (macOS only, for iOS builds)

```bash
sudo gem install cocoapods
pod --version  # Should show 1.15 or higher
```

### Install EAS CLI

```bash
npm install -g eas-cli
eas --version
```

## 2. Project Setup

### Clone and Install Dependencies

```bash
# Navigate to project directory
cd techtime

# Install dependencies
npm install

# Login to Expo
eas login
```

### Configure EAS Build

```bash
# Initialize EAS configuration (if not already done)
eas build:configure
```

## 3. Android Build Setup

### Verify Android Configuration

The project includes optimized Android configuration templates:

1. **gradle.properties** - Memory and performance settings
2. **app/build.gradle** - Build configuration with lint disabled
3. **root/build.gradle** - Gradle and Kotlin versions

These will be applied automatically when you run `expo prebuild` or EAS build.

### Build Android

```bash
# Production build (AAB for Play Store)
eas build --platform android --profile production

# Preview build (APK for testing)
eas build --platform android --profile preview
```

### Local Android Build (Optional)

```bash
# Generate native Android project
npx expo prebuild -p android

# Navigate to android directory
cd android

# Build release
./gradlew clean
./gradlew :app:bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## 4. iOS Build Setup

### Prerequisites (macOS only)

1. Install Xcode 16 from Mac App Store
2. Install Xcode Command Line Tools:
```bash
xcode-select --install
```

3. Accept Xcode license:
```bash
sudo xcodebuild -license accept
```

### Configure iOS Signing

1. **App Store Connect Setup:**
   - Go to https://appstoreconnect.apple.com
   - Create App ID: `com.buxrug.techtime`
   - Create provisioning profile for App Store distribution
   - Ensure Team ID matches your Apple Developer account

2. **Verify Bundle Identifier:**
   - Check `app.json` has `"bundleIdentifier": "com.buxrug.techtime"`
   - This must match your App Store Connect configuration

### Build iOS

```bash
# Production build (for App Store)
eas build --platform ios --profile production

# Preview build (for TestFlight)
eas build --platform ios --profile preview
```

### Local iOS Build (Optional)

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

## 5. Troubleshooting

### Android Issues

#### KSP Metaspace OutOfMemory
```bash
# Already configured in gradle.properties:
# org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m
# kotlin.daemon.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=1024m
```

If still failing, reduce memory:
```properties
org.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=768m
kotlin.daemon.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m
```

#### LintVital Failures
Already disabled in `app/build.gradle`:
```gradle
lint {
    abortOnError false
    checkReleaseBuilds false
}
```

#### Gradle Build Timeout
```bash
# Clear Gradle cache
cd android
./gradlew clean --no-daemon

# Or use EAS with cache clearing
eas build --platform android --clear-cache
```

### iOS Issues

#### Exit 65 Code Sign Error

1. **Verify Bundle Identifier:**
```bash
# Check app.json
grep bundleIdentifier app.json
# Should show: "bundleIdentifier": "com.buxrug.techtime"
```

2. **Check Provisioning Profile:**
   - Go to App Store Connect
   - Certificates, Identifiers & Profiles
   - Verify App ID matches `com.buxrug.techtime`
   - Download and install provisioning profile

3. **Remove Unused Entitlements:**
   - iCloud is already removed from `app.json`
   - If you see iCloud errors, check for any custom entitlements files

4. **Regenerate Certificates:**
```bash
# Let EAS handle certificates
eas credentials
```

#### Pod Install Failures
```bash
cd ios
pod cache clean --all
rm -rf Pods Podfile.lock
pod install --repo-update
```

#### Deployment Target Issues
Already configured in `app.json`:
```json
"ios": {
  "deploymentTarget": "13.4"
}
```

And in `Podfile`:
```ruby
platform :ios, '13.4'
```

## 6. Asset Optimization

### Check Asset Sizes
```bash
# Find large files (>10MB)
find assets -type f -size +10M -exec ls -lh {} \;

# Total assets size
du -sh assets/
```

### Optimize Images
```bash
# Install ImageOptim (macOS)
brew install --cask imageoptim

# Or use online tools:
# - TinyPNG: https://tinypng.com/
# - Squoosh: https://squoosh.app/
```

### Remove Unused Assets
```bash
# List all assets
ls -lh assets/images/

# Remove unused files
rm assets/images/unused-file.png
```

## 7. Build Verification

### Android
```bash
# After build completes, download AAB
eas build:list

# Test locally with bundletool
bundletool build-apks --bundle=app-release.aab --output=app.apks
bundletool install-apks --apks=app.apks
```

### iOS
```bash
# After build completes, download IPA
eas build:list

# Upload to TestFlight
eas submit --platform ios
```

## 8. Continuous Integration

### GitHub Actions (Example)

```yaml
name: EAS Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: eas build --platform android --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## 9. Environment Variables

### Local Development
Create `.env` file:
```bash
# .env
NODE_ENV=development
```

### EAS Secrets
```bash
# Set secrets for EAS builds
eas secret:create --scope project --name KEYSTORE_PASSWORD --value your_password
eas secret:create --scope project --name KEY_ALIAS --value your_alias
eas secret:create --scope project --name KEY_PASSWORD --value your_key_password
```

## 10. Final Checklist

Before submitting to stores:

### Android
- [ ] Build completes without errors
- [ ] AAB file generated
- [ ] Tested on physical device
- [ ] App signing configured in Play Console
- [ ] Privacy policy URL added
- [ ] Screenshots prepared

### iOS
- [ ] Build completes without errors
- [ ] IPA file generated
- [ ] Tested on physical device via TestFlight
- [ ] App Store Connect metadata complete
- [ ] Privacy policy URL added
- [ ] Screenshots prepared

## Support Resources

- **Expo Documentation**: https://docs.expo.dev/
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **React Native**: https://reactnative.dev/
- **Android Studio**: https://developer.android.com/studio
- **Xcode**: https://developer.apple.com/xcode/

## Common Commands Reference

```bash
# Development
npm run dev                    # Start Expo dev server
npm run android               # Start on Android
npm run ios                   # Start on iOS

# Building
eas build --platform android  # Build Android
eas build --platform ios      # Build iOS
eas build --platform all      # Build both

# Submission
eas submit --platform android # Submit to Play Store
eas submit --platform ios     # Submit to App Store

# Utilities
npx expo prebuild            # Generate native projects
npx expo prebuild --clean    # Clean and regenerate
eas build:list               # List all builds
eas credentials              # Manage credentials
```
