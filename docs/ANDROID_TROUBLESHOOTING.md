
# Android Troubleshooting Guide

## Common Issues and Solutions

### 1. Kotlin Version Errors

#### Error Message
```
Can't find KSP version for Kotlin version '1.9.24'
You're probably using an unsupported version of Kotlin
```

#### Solution
```bash
# 1. Verify gradle.properties has correct Kotlin version
cat gradle.properties | grep kotlinVersion
# Should show: kotlinVersion=2.0.21

# 2. Regenerate native files
npm run prebuild:android

# 3. Clean and rebuild
npm run gradle:clean
npm run android
```

### 2. Duplicate Class Errors

#### Error Message
```
Duplicate class com.facebook.jni.* found in modules:
- fbjni-0.7.0.aar
- fbjni-java-only-0.3.0.jar
```

#### Solution
The `fbjniExclusion.plugin.cjs` should handle this automatically. If you still see this error:

```bash
# 1. Clean Gradle cache
npm run gradle:clean

# 2. Regenerate native files
npm run prebuild:android

# 3. Rebuild
npm run android
```

### 3. Build Memory Issues

#### Error Message
```
OutOfMemoryError: Java heap space
```

#### Solution
```bash
# 1. Check gradle.properties has sufficient memory
cat gradle.properties | grep jvmargs
# Should show: org.gradle.jvmargs=-Xmx6144m ...

# 2. Close other applications

# 3. If still failing, increase heap size in gradle.properties
# Change -Xmx6144m to -Xmx8192m

# 4. Clean and rebuild
npm run gradle:clean
npm run android
```

### 4. Gradle Daemon Issues

#### Error Message
```
Gradle daemon disappeared unexpectedly
```

#### Solution
```bash
# 1. Stop all Gradle daemons
npm run gradle:stop

# 2. Clean build cache
npm run gradle:clean

# 3. Restart build
npm run android
```

### 5. Metro Bundler Port Conflict

#### Error Message
```
Error: listen EADDRINUSE: address already in use :::8081
```

#### Solution
```bash
# Option 1: Kill process on port 8081
# macOS/Linux
lsof -ti:8081 | xargs kill -9

# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Option 2: Use different port
npx react-native start --port 8082
```

### 6. ADB Connection Issues

#### Error Message
```
error: no devices/emulators found
```

#### Solution
```bash
# 1. Restart ADB server
adb kill-server
adb start-server

# 2. Check connected devices
adb devices

# 3. If emulator not showing, restart it from Android Studio

# 4. If physical device not showing:
#    - Check USB debugging is enabled
#    - Try different USB cable
#    - Try different USB port
#    - Revoke and re-authorize USB debugging
```

### 7. Android SDK Not Found

#### Error Message
```
SDK location not found
```

#### Solution
```bash
# 1. Set ANDROID_HOME environment variable
# macOS/Linux (add to ~/.bashrc or ~/.zshrc)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Windows (add to System Environment Variables)
# ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk

# 2. Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc

# 3. Verify
echo $ANDROID_HOME
```

### 8. Build Tools Version Mismatch

#### Error Message
```
Failed to find Build Tools revision X.X.X
```

#### Solution
```bash
# 1. Open Android Studio
# 2. Go to Tools > SDK Manager
# 3. Go to SDK Tools tab
# 4. Install the required Build Tools version (35.0.0)
# 5. Rebuild
npm run android
```

### 9. NDK Not Found

#### Error Message
```
NDK is not installed
```

#### Solution
```bash
# 1. Open Android Studio
# 2. Go to Tools > SDK Manager
# 3. Go to SDK Tools tab
# 4. Check "NDK (Side by side)"
# 5. Install version 26.1.10909125
# 6. Rebuild
npm run android
```

### 10. Hermes Build Errors

#### Error Message
```
Execution failed for task ':app:bundleReleaseJsAndAssets'
```

#### Solution
```bash
# 1. Clean Metro cache
npx react-native start --reset-cache

# 2. Clean Gradle cache
npm run gradle:clean

# 3. Regenerate native files
npm run prebuild:android

# 4. Rebuild
npm run build:android
```

### 11. ProGuard Errors

#### Error Message
```
ProGuard configuration error
```

#### Solution
```bash
# 1. Check if ProGuard rules are correct
# 2. For development, disable ProGuard temporarily
# In app.json, set:
# "enableProguardInReleaseBuilds": false

# 3. Rebuild
npm run android

# 4. For production, add custom ProGuard rules if needed
```

### 12. Resource Linking Errors

#### Error Message
```
error: resource android:attr/lStar not found
```

#### Solution
```bash
# 1. Update compileSdkVersion in app.json
# Should be: "compileSdkVersion": 35

# 2. Regenerate native files
npm run prebuild:android

# 3. Rebuild
npm run android
```

### 13. Manifest Merger Errors

#### Error Message
```
Manifest merger failed
```

#### Solution
```bash
# 1. Check for conflicting permissions or activities
# 2. Review AndroidManifest.xml in android/app/src/main/
# 3. Add tools:replace if needed
# 4. Regenerate native files
npm run prebuild:android
```

### 14. Native Module Linking Errors

#### Error Message
```
Unable to resolve module X from Y
```

#### Solution
```bash
# 1. Clear Metro cache
npx react-native start --reset-cache

# 2. Clear node_modules and reinstall
rm -rf node_modules
npm install

# 3. Clear watchman cache (macOS/Linux)
watchman watch-del-all

# 4. Regenerate native files
npm run prebuild:android

# 5. Rebuild
npm run android
```

### 15. Signing Configuration Errors

#### Error Message
```
Keystore file not found
```

#### Solution
```bash
# For development builds, this should not happen
# For release builds:

# 1. Generate keystore if not exists
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 2. Configure signing in android/app/build.gradle
# 3. Rebuild
npm run build:android
```

## Debugging Tips

### Enable Verbose Logging
```bash
# Gradle verbose logging
cd android && ./gradlew assembleDebug --stacktrace --info

# Metro bundler verbose logging
npx react-native start --verbose
```

### Check Gradle Dependencies
```bash
npm run android:dependencies
```

### Check Gradle Configuration
```bash
npm run android:check
```

### View Android Logs
```bash
# View all logs
adb logcat

# Filter by app
adb logcat | grep "TechTime"

# Clear logs
adb logcat -c
```

### Inspect APK
```bash
# List contents
unzip -l app-release.apk

# Extract APK
unzip app-release.apk -d extracted/

# Check APK size
ls -lh app-release.apk
```

## Performance Debugging

### Check App Startup Time
```bash
adb shell am start -W com.brcarszw.techtracer/.MainActivity
```

### Monitor Memory Usage
```bash
adb shell dumpsys meminfo com.brcarszw.techtracer
```

### Monitor CPU Usage
```bash
adb shell top | grep techtracer
```

### Check Battery Usage
```bash
adb shell dumpsys batterystats com.brcarszw.techtracer
```

## Clean Build Process

If all else fails, try a complete clean build:

```bash
# 1. Stop all processes
npm run gradle:stop

# 2. Clean everything
npm run gradle:clean
rm -rf android/
rm -rf node_modules/
rm -rf .expo/

# 3. Reinstall dependencies
npm install

# 4. Regenerate native files
npm run prebuild:android

# 5. Rebuild
npm run android
```

## Getting Help

### Check Logs
1. Metro bundler logs (terminal)
2. Android Logcat (Android Studio or adb logcat)
3. Gradle build logs (terminal)

### Search for Solutions
1. Check Expo documentation
2. Check React Native documentation
3. Search GitHub issues
4. Search Stack Overflow

### Ask for Help
1. Expo Discord: https://chat.expo.dev
2. React Native Community: https://reactnative.dev/help
3. Stack Overflow: Tag with `expo`, `react-native`, `android`

## Prevention

### Best Practices
1. Always use `npm run prebuild:android` after config changes
2. Keep dependencies up to date
3. Test on multiple Android versions
4. Test on both emulator and physical devices
5. Clean build cache regularly
6. Monitor build logs for warnings

### Regular Maintenance
```bash
# Weekly
npm run gradle:clean

# After dependency updates
npm run prebuild:android

# Before important builds
npm run gradle:stop
npm run gradle:clean
npm run prebuild:android
```
