
# New Architecture Build Checklist

Use this checklist to ensure all configurations are correct before building.

## ✅ Pre-Build Checklist

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] Expo CLI installed globally
- [ ] EAS CLI installed globally
- [ ] Android Studio with SDK 36 (for Android builds)
- [ ] Xcode 14+ (for iOS builds)
- [ ] NDK 27.1 installed (for Android builds)
- [ ] CMake 3.22.1 installed (for Android builds)

### Configuration Files

#### app.json
- [ ] `"newArchEnabled": true` at root level
- [ ] `"jsEngine": "hermes"` in ios section
- [ ] `"jsEngine": "hermes"` in android section

#### .env
- [ ] File exists in project root
- [ ] Contains `NODE_ENV=production`

#### eas.json
- [ ] `"image": "latest"` in all build profiles
- [ ] `"env": { "NODE_ENV": "production" }` in production profile
- [ ] `"env": { "NODE_ENV": "production" }` in preview profile

#### android/gradle.properties (after prebuild)
- [ ] `newArchEnabled=true`
- [ ] `hermesEnabled=true`
- [ ] `org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8`
- [ ] `android.useAndroidX=true`
- [ ] `android.nonTransitiveRClass=true`
- [ ] `reactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64`

#### android/app/build.gradle (after prebuild)
- [ ] `compileSdk 36`
- [ ] `targetSdk 36`
- [ ] `ndkVersion "27.1.10909125"`
- [ ] `tasks.configureEach { it.environment("NODE_ENV", "production") }` at top
- [ ] `react { enableHermes = true; newArchEnabled = ... }` block present
- [ ] `lint { abortOnError false; checkReleaseBuilds false }`
- [ ] `compileOptions` set to `JavaVersion.VERSION_17`

#### android/build.gradle (after prebuild)
- [ ] AGP version 8.5.0 or higher
- [ ] Kotlin version 2.1.0 or higher
- [ ] `allprojects { tasks.configureEach { it.environment("NODE_ENV", ...) } }`

#### ios/Podfile (after prebuild)
- [ ] `platform :ios, '13.4'`
- [ ] `use_frameworks! :linkage => :static`
- [ ] `$RN_HERMES_ENABLED = true`
- [ ] `ENV['RCT_NEW_ARCH_ENABLED'] = '1'`
- [ ] `post_install` block with `react_native_post_install`
- [ ] Deployment target fix in post_install

### Dependencies
- [ ] `react-native-reanimated` version compatible with New Architecture (4.1.0+)
- [ ] All Expo packages at compatible versions for Expo 54
- [ ] No deprecated or incompatible packages

## 🧹 Clean Build Steps

### Before Building
```bash
# 1. Clean all build artifacts
rm -rf android/.gradle android/build ios/Pods ios/build

# 2. Clean node modules (optional)
rm -rf node_modules package-lock.json
npm install

# 3. Set environment variable
export NODE_ENV=production
```

### iOS Specific
```bash
# 4. Clean iOS pods
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install --repo-update
cd ..
```

### Android Specific
```bash
# 5. Clean Gradle cache (if needed)
cd android
./gradlew clean
cd ..
```

## 🏗️ Build Commands

### EAS Build (Recommended)

#### Android
```bash
eas build --platform android --profile production
```

#### iOS
```bash
eas build --platform ios --profile production
```

#### Both Platforms
```bash
eas build --platform all --profile production
```

### Local Build (Advanced)

#### Android Local
```bash
# Prebuild
expo prebuild -p android --clean

# Build AAB
cd android
./gradlew :app:bundleRelease

# Build APK
./gradlew :app:assembleRelease
```

#### iOS Local
```bash
# Prebuild
expo prebuild -p ios --clean

# Open in Xcode
open ios/techtime.xcworkspace

# Archive in Xcode: Product > Archive
```

## 🔍 Verification Steps

### After Build Completes

#### Android
- [ ] AAB file generated in `android/app/build/outputs/bundle/release/`
- [ ] File size is reasonable (not too large)
- [ ] No critical errors in build logs

#### iOS
- [ ] IPA file available in EAS dashboard or Xcode Organizer
- [ ] Archive shows in Xcode Organizer
- [ ] No critical errors in build logs

### Runtime Verification
- [ ] App launches successfully
- [ ] No crashes on startup
- [ ] Hermes is active (check logs)
- [ ] New Architecture is active (check logs)
- [ ] All features work as expected
- [ ] Animations are smooth
- [ ] No performance regressions

## 🐛 Common Issues & Solutions

### Issue: `assertNewArchitectureEnabledTask` fails
**Solution:**
- Ensure `newArchEnabled=true` in `android/gradle.properties`
- Clean build: `rm -rf android/.gradle android/build`
- Verify `react-native-reanimated` version is 4.1.0+

### Issue: "NODE_ENV environment variable is required"
**Solution:**
- Create `.env` file with `NODE_ENV=production`
- Add to `eas.json` env section
- Export before local builds: `export NODE_ENV=production`

### Issue: OutOfMemoryError during Android build
**Solution:**
- Increase JVM memory in `gradle.properties`
- Reduce worker processes: `org.gradle.workers.max=2`
- Limit ABIs: `abiFilters "arm64-v8a", "armeabi-v7a"`

### Issue: iOS pod install fails
**Solution:**
- Update CocoaPods: `sudo gem install cocoapods`
- Clear cache: `pod cache clean --all`
- Remove lock: `rm ios/Podfile.lock`
- Retry: `pod install --repo-update`

### Issue: Hermes not enabled
**Solution:**
- Check `app.json` has `"jsEngine": "hermes"`
- Verify `hermesEnabled=true` in `gradle.properties`
- Verify `$RN_HERMES_ENABLED = true` in Podfile
- Run `pod install --repo-update` after changes

### Issue: Deprecated kotlinOptions warning
**Solution:**
- This is a warning, not an error
- Build should still succeed
- Can be ignored for now (will be fixed in future Kotlin versions)

## 📊 Build Success Indicators

### Android Build Success
```
✓ compileSdk: 36
✓ targetSdk: 36
✓ newArchEnabled: true
✓ hermesEnabled: true
✓ NDK: 27.1.10909125
✓ AGP: 8.5.0+
✓ Kotlin: 2.1.0+
✓ Output: app-release.aab
```

### iOS Build Success
```
✓ Deployment Target: 13.4
✓ RCT_NEW_ARCH_ENABLED: 1
✓ Hermes: Enabled
✓ Fabric: Enabled
✓ Static Frameworks: Yes
✓ Output: .ipa file
```

## 🚀 Final Steps

- [ ] Test app on physical devices (both platforms)
- [ ] Verify all features work correctly
- [ ] Check performance and memory usage
- [ ] Review crash logs (if any)
- [ ] Prepare for app store submission
- [ ] Update version numbers
- [ ] Create release notes

## 📝 Notes

- New Architecture may require updates to some third-party libraries
- Some libraries may not yet support New Architecture
- Hermes provides better performance and smaller bundle sizes
- Always test thoroughly before releasing to production
- Keep backups of working configurations

## 🆘 Need Help?

If builds still fail after following this checklist:

1. Check the first error line in build logs
2. Search for the error in React Native/Expo documentation
3. Verify all versions are compatible
4. Try a completely clean build
5. Check if any third-party libraries are incompatible

## ✅ Build Complete!

Once all checks pass and builds succeed:
- Android AAB: Ready for Google Play
- iOS IPA: Ready for App Store Connect

Congratulations! Your app is now built with the New Architecture and Hermes enabled! 🎉
