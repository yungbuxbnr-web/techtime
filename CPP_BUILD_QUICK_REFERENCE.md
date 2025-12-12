
# C++ Build Fix - Quick Reference Card

## The Problem
```
❌ 3 errors generated.
❌ ninja: build stopped: subcommand failed.
❌ C++ build system [build] failed
```

## The Solution
```bash
pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

---

## Quick Commands

### Fix C++ Build
```bash
pnpm run fix:cpp
```

### Clean Prebuild
```bash
npx expo prebuild --clean
```

### Build Android
```bash
pnpm run android
```

### Clean Gradle
```bash
pnpm run gradle:clean
```

### Stop Gradle Daemons
```bash
pnpm run gradle:stop
```

### Nuclear Option (Clean Everything)
```bash
pnpm run gradle:stop && rm -rf android ios node_modules && pnpm install && pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

---

## Verification Commands

### Check Plugin
```bash
grep cppBuildConfig app.config.js
```

### Check NDK Version
```bash
grep ndkVersion android/build.gradle
```

### Check CMake Flags
```bash
grep cppFlags android/app/build.gradle
```

### Check CMakeLists.txt
```bash
grep "CMAKE_CXX_STANDARD 17" node_modules/react-native-gesture-handler/android/CMakeLists.txt
```

---

## What Gets Fixed

| Before | After |
|--------|-------|
| ❌ NDK: default | ✅ NDK: 26.1.10909125 |
| ❌ CMake: none | ✅ CMake: -std=c++17 -frtti -fexceptions |
| ❌ C++: 14 | ✅ C++: 17 |
| ❌ Build: FAILED | ✅ Build: SUCCESS |

---

## Documentation

| File | Purpose |
|------|---------|
| `README_CPP_FIX.md` | Overview |
| `QUICK_FIX_CPP_BUILD.md` | Quick fix guide |
| `CPP_BUILD_FIX.md` | Technical details |
| `CPP_BUILD_CHECKLIST.md` | Verification steps |

---

## Troubleshooting

### Build Fails After Fix
```bash
pnpm run gradle:stop
pnpm run gradle:clean
rm -rf android
npx expo prebuild --clean
pnpm run android
```

### CMakeLists.txt Not Patched
```bash
pnpm run fix:cpp
```

### Node Modules Missing
```bash
pnpm install
pnpm run fix:cpp
```

### Gradle Daemon Issues
```bash
cd android && ./gradlew --stop
cd android && ./gradlew clean --no-daemon
```

---

## Success Indicators

✅ `pnpm run fix:cpp` completes without errors
✅ `npx expo prebuild` succeeds
✅ NDK version is 26.1.10909125
✅ CMake flags include -std=c++17
✅ CMakeLists.txt has CMAKE_CXX_STANDARD 17
✅ Android build completes
✅ No C++ errors

---

## When to Run

### After `pnpm install`
```bash
# Runs automatically via postinstall
# Or run manually:
pnpm run fix:cpp
```

### Before Building
```bash
pnpm run fix:cpp
npx expo prebuild --clean
pnpm run android
```

### After Updating RN/Expo
```bash
rm -rf android ios node_modules
pnpm install
pnpm run fix:cpp
npx expo prebuild --clean
pnpm run android
```

---

## Files Modified

### Created
- `plugins/cppBuildConfig.plugin.cjs`
- `scripts/fix-cpp-build.cjs`

### Updated
- `app.config.js` (added plugin)
- `package.json` (added scripts)

### Generated (during prebuild)
- `android/build.gradle` (NDK version)
- `android/app/build.gradle` (CMake flags)

### Patched (during fix)
- `node_modules/react-native-gesture-handler/android/CMakeLists.txt`
- `node_modules/react-native-reanimated/android/CMakeLists.txt`
- `node_modules/react-native-yoga/android/CMakeLists.txt`

---

## Technical Details

### Why C++17?
React Native 0.81+ uses modern C++ features that require C++17

### Why This NDK?
NDK 26.1.10909125 includes Clang 17.0.2 with full C++17 support

### Why RTTI and Exceptions?
Required for React Native's C++ bridge and error handling

---

## Support

### Check Error Message
Look for specific errors in Gradle logs

### Verify Node Version
```bash
node --version
# Should be 18-22
```

### Verify Android SDK
```bash
echo $ANDROID_HOME
```

### Check NDK Installation
```bash
ls $ANDROID_HOME/ndk/
# Should show 26.1.10909125
```

---

## One-Liners

### Full Fix
```bash
pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

### Clean and Fix
```bash
pnpm run gradle:stop && pnpm run gradle:clean && pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

### Nuclear Clean
```bash
rm -rf android ios node_modules && pnpm install && pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

---

**Print this card and keep it handy!**

**Version**: 1.0.0
**For**: React Native 0.81+, Expo 54+
**NDK**: 26.1.10909125
**C++**: 17
