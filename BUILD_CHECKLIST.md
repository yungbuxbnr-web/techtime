
# TechTime Build Checklist

Use this checklist before initiating builds to ensure everything is configured correctly.

## Pre-Build Checklist

### Environment Setup
- [ ] Node.js 20.x installed and verified (`node --version`)
- [ ] Java 17 installed and verified (`java -version`)
- [ ] JAVA_HOME environment variable set correctly
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged into Expo account (`eas login`)
- [ ] CocoaPods 1.15+ installed (macOS only, `pod --version`)

### Project Setup
- [ ] Dependencies installed (`npm install`)
- [ ] No errors in `npm install` output
- [ ] `.gitignore` includes build folders
- [ ] `app.json` reviewed and correct
- [ ] `eas.json` configured properly

### Android Configuration
- [ ] Bundle identifier: `com.buxrug.techtime` in `app.json`
- [ ] Memory settings in `gradle.properties` template:
  - [ ] `org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m`
  - [ ] `kotlin.daemon.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=1024m`
  - [ ] `kotlin.incremental=true`
  - [ ] `org.gradle.workers.max=2`
- [ ] Lint disabled in `app/build.gradle` template:
  - [ ] `abortOnError false`
  - [ ] `checkReleaseBuilds false`
- [ ] Java 17 compatibility set
- [ ] ABI filters configured (arm64-v8a, armeabi-v7a)

### iOS Configuration
- [ ] Bundle identifier: `com.buxrug.techtime` in `app.json`
- [ ] Deployment target: `13.4` in `app.json`
- [ ] iCloud entitlements removed (no `usesIcloudStorage`)
- [ ] Push notification entitlements removed (if not needed)
- [ ] Associated domains removed (if not needed)
- [ ] Podfile template has:
  - [ ] `platform :ios, '13.4'`
  - [ ] `use_frameworks! :linkage => :static`
  - [ ] Deployment target fix in post_install

### Code Signing
- [ ] **Android**: Keystore configured (or using EAS managed signing)
- [ ] **iOS**: Provisioning profile matches `com.buxrug.techtime`
- [ ] **iOS**: Certificate valid and matches Team ID
- [ ] **iOS**: App ID created in App Store Connect

### Assets
- [ ] All images optimized (no files >10MB recommended)
- [ ] Unused assets removed
- [ ] Total assets folder <100MB
- [ ] App icon present and correct size
- [ ] Splash screen configured

## Android Build Checklist

### Before Building
- [ ] Reviewed `android-config-templates/gradle.properties.template`
- [ ] Reviewed `android-config-templates/app-build.gradle.template`
- [ ] Reviewed `android-config-templates/root-build.gradle.template`
- [ ] No large native libraries (>50MB)
- [ ] ABI filters appropriate for target devices

### Build Process
- [ ] Run: `eas build --platform android --profile production`
- [ ] Build starts without errors
- [ ] No memory errors during build
- [ ] No lint errors blocking build
- [ ] Build completes successfully
- [ ] AAB file generated

### After Building
- [ ] Download AAB from EAS
- [ ] Verify AAB size (<150MB recommended)
- [ ] Test on physical device (if possible)
- [ ] Check app launches correctly
- [ ] Verify all features work

### Play Store Preparation
- [ ] App signing configured in Play Console
- [ ] Privacy policy URL ready
- [ ] Screenshots prepared (phone, tablet)
- [ ] App description written
- [ ] Release notes prepared

## iOS Build Checklist

### Before Building
- [ ] Xcode 16 installed (macOS only)
- [ ] Xcode command line tools installed
- [ ] Bundle identifier matches App Store Connect
- [ ] Provisioning profile downloaded and valid
- [ ] Certificate not expired
- [ ] Team ID correct

### Build Process
- [ ] Run: `eas build --platform ios --profile production`
- [ ] Build starts without errors
- [ ] No code signing errors
- [ ] No pod install errors
- [ ] Build completes successfully
- [ ] IPA file generated

### After Building
- [ ] Download IPA from EAS
- [ ] Verify IPA size (<200MB recommended)
- [ ] Upload to TestFlight
- [ ] Test on physical device via TestFlight
- [ ] Check app launches correctly
- [ ] Verify all features work

### App Store Preparation
- [ ] App Store Connect metadata complete
- [ ] Privacy policy URL added
- [ ] Screenshots prepared (all required sizes)
- [ ] App description written
- [ ] Release notes prepared
- [ ] Age rating selected
- [ ] Categories selected

## Common Issues Checklist

### Android Issues
- [ ] **KSP Metaspace OOM**: Memory settings applied in gradle.properties
- [ ] **LintVital failures**: Lint disabled in app/build.gradle
- [ ] **Build timeout**: Using `--clear-cache` if needed
- [ ] **NDK errors**: NDK version specified (26.1.10909125)
- [ ] **Gradle lock**: Workers limited to 2

### iOS Issues
- [ ] **Exit 65**: Bundle identifier verified
- [ ] **Code signing**: Provisioning profile matches bundle ID
- [ ] **iCloud errors**: iCloud entitlements removed
- [ ] **Pod install**: Cache cleared if needed
- [ ] **Deployment target**: Set to 13.4 everywhere

## Final Verification

### Both Platforms
- [ ] App version incremented
- [ ] Build number auto-incremented
- [ ] Hermes enabled (for performance)
- [ ] No console errors in app
- [ ] All features tested
- [ ] Performance acceptable
- [ ] No memory leaks

### Documentation
- [ ] README updated (if needed)
- [ ] CHANGELOG updated
- [ ] Version notes documented
- [ ] Known issues documented

## Submission Checklist

### Android Submission
- [ ] AAB uploaded to Play Console
- [ ] Release track selected (internal/alpha/beta/production)
- [ ] Release notes added
- [ ] Screenshots uploaded
- [ ] Privacy policy linked
- [ ] Content rating completed
- [ ] Pricing set
- [ ] Countries selected
- [ ] Submit for review

### iOS Submission
- [ ] IPA uploaded to App Store Connect
- [ ] TestFlight testing complete
- [ ] Screenshots uploaded (all sizes)
- [ ] App preview videos (optional)
- [ ] Privacy policy linked
- [ ] Age rating set
- [ ] Categories selected
- [ ] Pricing set
- [ ] Countries selected
- [ ] Submit for review

## Post-Submission

### Monitoring
- [ ] Check review status daily
- [ ] Respond to review feedback promptly
- [ ] Monitor crash reports
- [ ] Monitor user reviews
- [ ] Track download numbers

### Updates
- [ ] Plan next version features
- [ ] Address user feedback
- [ ] Fix reported bugs
- [ ] Optimize performance
- [ ] Update dependencies

## Emergency Rollback

If critical issues found:

### Android
- [ ] Halt rollout in Play Console
- [ ] Fix issue
- [ ] Increment version
- [ ] Rebuild and resubmit

### iOS
- [ ] Remove from sale (if needed)
- [ ] Fix issue
- [ ] Increment version
- [ ] Rebuild and resubmit

## Notes

### Build Times
- Android: ~15-30 minutes
- iOS: ~20-40 minutes
- Both: ~30-60 minutes

### Build Costs
- Check EAS pricing: https://expo.dev/pricing
- Free tier: Limited builds per month
- Paid tier: Unlimited builds

### Support Resources
- Expo Discord: https://chat.expo.dev/
- Expo Forums: https://forums.expo.dev/
- Stack Overflow: Tag with `expo` and `react-native`

## Success Criteria

Build is successful when:
- ✅ No build errors
- ✅ AAB/IPA generated
- ✅ File size reasonable
- ✅ App installs on device
- ✅ App launches without crashes
- ✅ All features functional
- ✅ Performance acceptable
- ✅ No memory issues
- ✅ Passes store review

---

**Last Updated**: Check this checklist before every build to ensure consistency and catch issues early.
