
# C++ Build Fix Checklist

Use this checklist to verify that the C++ build fix has been applied correctly.

## Pre-Build Checklist

### ✅ 1. Config Plugin is Active

Check `app.config.js`:
```bash
grep -A 5 "plugins:" app.config.js | grep cppBuildConfig
```

Expected output:
```
'./plugins/cppBuildConfig.plugin.cjs',
```

### ✅ 2. Plugin File Exists

```bash
ls -la plugins/cppBuildConfig.plugin.cjs
```

Expected: File exists and is readable

### ✅ 3. Fix Script Exists

```bash
ls -la scripts/fix-cpp-build.cjs
```

Expected: File exists and is readable

### ✅ 4. NPM Script is Available

```bash
npm run fix:cpp --help 2>&1 | head -1
```

Expected: Script runs (even if it shows help/error)

### ✅ 5. Node Modules are Installed

```bash
ls node_modules/react-native-gesture-handler
ls node_modules/react-native-reanimated
ls node_modules/react-native-yoga
```

Expected: All three directories exist

## Run the Fix

### ✅ 6. Execute Fix Script

```bash
pnpm run fix:cpp
```

Expected output should include:
- ✅ Verifying node_modules
- ✅ Cleaning C++ build caches
- ✅ Patching CMakeLists.txt files
- ✅ C++ build configuration completed successfully

### ✅ 7. Verify CMakeLists.txt Patches

Check gesture-handler:
```bash
grep "CMAKE_CXX_STANDARD 17" node_modules/react-native-gesture-handler/android/CMakeLists.txt
```

Check reanimated:
```bash
grep "CMAKE_CXX_STANDARD 17" node_modules/react-native-reanimated/android/CMakeLists.txt
```

Check yoga:
```bash
grep "CMAKE_CXX_STANDARD 17" node_modules/react-native-yoga/android/CMakeLists.txt
```

Expected: Each command returns a line with `set(CMAKE_CXX_STANDARD 17)`

## Prebuild Checklist

### ✅ 8. Run Prebuild

```bash
npx expo prebuild --clean
```

Expected: Completes without errors

### ✅ 9. Verify Android Folder

```bash
ls -la android/
```

Expected: android folder exists with build.gradle, app/, etc.

### ✅ 10. Check NDK Version in Project build.gradle

```bash
grep -A 10 "ext {" android/build.gradle | grep ndkVersion
```

Expected output:
```
ndkVersion = "26.1.10909125"
```

### ✅ 11. Check CMake Flags in App build.gradle

```bash
grep -A 5 "externalNativeBuild" android/app/build.gradle | grep cppFlags
```

Expected output:
```
cppFlags "-std=c++17 -frtti -fexceptions"
```

## Build Checklist

### ✅ 12. Stop Gradle Daemons

```bash
cd android && ./gradlew --stop
```

Expected: Gradle daemons stopped (or "No Gradle daemons are running")

### ✅ 13. Clean Gradle Build

```bash
cd android && ./gradlew clean --no-daemon
```

Expected: BUILD SUCCESSFUL

### ✅ 14. Build Android App

```bash
pnpm run android
```

OR

```bash
npx expo run:android
```

Expected: Build completes successfully and app launches

## Post-Build Verification

### ✅ 15. Check for C++ Errors

Review the build output for:
- ❌ "3 errors generated"
- ❌ "ninja: build stopped"
- ❌ "C++ build system [build] failed"

Expected: None of these errors appear

### ✅ 16. Verify .cxx Folders Were Created

```bash
ls android/.cxx/
```

Expected: Folder exists with build artifacts

### ✅ 17. Check Build Logs

```bash
cd android && ./gradlew assembleDebug --info 2>&1 | grep -i "c++17"
```

Expected: Should show C++17 being used in compilation

## Troubleshooting Checklist

If any step fails, use this troubleshooting checklist:

### ❌ Fix Script Fails

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Try fix again
pnpm run fix:cpp
```

### ❌ Prebuild Fails

```bash
# Clean everything
rm -rf android ios

# Try prebuild again
npx expo prebuild --clean
```

### ❌ Build Fails with C++ Errors

```bash
# Clean C++ caches
rm -rf android/.cxx
rm -rf node_modules/react-native-gesture-handler/android/.cxx
rm -rf node_modules/react-native-reanimated/android/.cxx

# Run fix again
pnpm run fix:cpp

# Clean prebuild
npx expo prebuild --clean

# Try build again
pnpm run android
```

### ❌ NDK Version Not Set

```bash
# Check if plugin is in app.config.js
grep cppBuildConfig app.config.js

# If missing, add it manually to plugins array:
# './plugins/cppBuildConfig.plugin.cjs',

# Run prebuild again
npx expo prebuild --clean
```

### ❌ CMake Flags Not Set

```bash
# Run fix script
pnpm run fix:cpp

# Prebuild again
npx expo prebuild --clean

# Check app/build.gradle
grep -A 5 "externalNativeBuild" android/app/build.gradle
```

## Success Criteria

Your C++ build fix is successful when:

✅ All pre-build checks pass
✅ Fix script completes without errors
✅ Prebuild generates android folder
✅ NDK version is set to 26.1.10909125
✅ CMake flags include -std=c++17 -frtti -fexceptions
✅ CMakeLists.txt files have CMAKE_CXX_STANDARD 17
✅ Android build completes successfully
✅ No C++ compilation errors
✅ App launches on device/emulator

## Quick Reference

### Run Full Fix Sequence

```bash
# One command to fix everything
pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

### Clean Everything and Start Fresh

```bash
# Nuclear option - clean everything
pnpm run gradle:stop
rm -rf android ios node_modules
pnpm install
pnpm run fix:cpp
npx expo prebuild --clean
pnpm run android
```

### Verify Fix is Applied

```bash
# Check all key files
echo "=== Config Plugin ==="
grep cppBuildConfig app.config.js

echo "=== CMakeLists.txt Patches ==="
grep "CMAKE_CXX_STANDARD 17" node_modules/react-native-gesture-handler/android/CMakeLists.txt
grep "CMAKE_CXX_STANDARD 17" node_modules/react-native-reanimated/android/CMakeLists.txt

echo "=== NDK Version ==="
grep ndkVersion android/build.gradle

echo "=== CMake Flags ==="
grep cppFlags android/app/build.gradle
```

## Documentation Reference

- **Quick Fix**: `QUICK_FIX_CPP_BUILD.md`
- **Detailed Guide**: `CPP_BUILD_FIX.md`
- **Summary**: `CPP_BUILD_FIX_SUMMARY.md`
- **This Checklist**: `CPP_BUILD_CHECKLIST.md`
- **General Troubleshooting**: `BUILD_TROUBLESHOOTING.md`

## Need Help?

If you've gone through this entire checklist and still have issues:

1. Check the Gradle build logs for specific error messages
2. Verify your Node version: `node --version` (should be 18-22)
3. Verify your Android SDK is installed: `echo $ANDROID_HOME`
4. Check that NDK 26.1.10909125 is available: `ls $ANDROID_HOME/ndk/`
5. Review the detailed documentation in `CPP_BUILD_FIX.md`

## Maintenance

### After Each `pnpm install`

The postinstall script runs automatically, but you can verify:

```bash
# Check postinstall ran
pnpm install 2>&1 | grep "C++ build"

# If needed, run manually
pnpm run fix:cpp
```

### Before Each Build

```bash
# Optional: Clean Gradle cache
pnpm run gradle:clean

# Run the build
pnpm run android
```

### After Updating React Native or Expo

```bash
# Clean everything
rm -rf android ios node_modules

# Reinstall
pnpm install

# Fix should run automatically, but verify
pnpm run fix:cpp

# Prebuild
npx expo prebuild --clean

# Build
pnpm run android
```

---

**Last Updated**: When C++ build fix was implemented
**Applies To**: React Native 0.81+, Expo 54+
**NDK Version**: 26.1.10909125
**C++ Standard**: C++17
