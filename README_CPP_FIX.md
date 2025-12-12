
# C++ Build Fix for React Native 0.81+ / Expo 54

## TL;DR

If you're getting C++ build errors like "ninja: build stopped" or "C++ build system [build] failed", run:

```bash
pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

## What's the Problem?

React Native 0.81+ requires C++17, but `react-native-gesture-handler` and other native modules default to C++14. This causes compilation errors during Android builds.

## What's the Solution?

We've implemented an automated fix that:

1. **Forces NDK 26.1.10909125** - The correct NDK version for RN 0.81+
2. **Adds CMake flags** - Configures C++17 with RTTI and exceptions
3. **Patches CMakeLists.txt** - Updates native modules to use C++17
4. **Cleans build caches** - Removes old C++ artifacts

## How to Use

### Automatic (Recommended)

The fix runs automatically after `pnpm install`. Just build your app:

```bash
pnpm install
npx expo prebuild --clean
pnpm run android
```

### Manual

If you encounter build errors, run the fix manually:

```bash
pnpm run fix:cpp
npx expo prebuild --clean
pnpm run android
```

### One-Command Fix

```bash
pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

## What Gets Fixed

### Before Fix
```
❌ NDK version: default (varies)
❌ CMake flags: none
❌ C++ standard: C++14 (default)
❌ Build result: FAILED with C++ errors
```

### After Fix
```
✅ NDK version: 26.1.10909125
✅ CMake flags: -std=c++17 -frtti -fexceptions
✅ C++ standard: C++17
✅ Build result: SUCCESS
```

## Files Created

- `plugins/cppBuildConfig.plugin.cjs` - Expo config plugin
- `scripts/fix-cpp-build.cjs` - Build fix script
- `CPP_BUILD_FIX.md` - Detailed documentation
- `QUICK_FIX_CPP_BUILD.md` - Quick reference
- `CPP_BUILD_FIX_SUMMARY.md` - Implementation summary
- `CPP_BUILD_CHECKLIST.md` - Verification checklist

## Quick Reference

### Commands

```bash
# Run the fix
pnpm run fix:cpp

# Clean prebuild
npx expo prebuild --clean

# Build Android
pnpm run android

# Clean Gradle
pnpm run gradle:clean

# Stop Gradle daemons
pnpm run gradle:stop
```

### Verification

```bash
# Check NDK version
grep ndkVersion android/build.gradle

# Check CMake flags
grep cppFlags android/app/build.gradle

# Check CMakeLists.txt
grep "CMAKE_CXX_STANDARD 17" node_modules/react-native-gesture-handler/android/CMakeLists.txt
```

## Troubleshooting

### Build Still Fails?

```bash
# Nuclear option - clean everything
pnpm run gradle:stop
rm -rf android ios node_modules
pnpm install
pnpm run fix:cpp
npx expo prebuild --clean
pnpm run android
```

### CMakeLists.txt Changes Don't Persist?

This is normal - they're in `node_modules`. The fix runs automatically after `pnpm install`, or run manually:

```bash
pnpm run fix:cpp
```

### Need More Help?

See the detailed documentation:
- `QUICK_FIX_CPP_BUILD.md` - Quick fix guide
- `CPP_BUILD_FIX.md` - Full technical details
- `CPP_BUILD_CHECKLIST.md` - Step-by-step verification
- `BUILD_TROUBLESHOOTING.md` - General build issues

## Technical Details

### Why C++17?

React Native 0.81+ uses modern C++ features that require C++17:
- `std::optional`
- `std::variant`
- `if constexpr`
- Structured bindings

### Why This NDK?

NDK 26.1.10909125 includes:
- Clang 17.0.2 with full C++17 support
- Updated STL with C++17 features
- Better Gradle 8+ compatibility

### Why RTTI and Exceptions?

- **RTTI** (`-frtti`): Required for React Native's C++ bridge
- **Exceptions** (`-fexceptions`): Required for error handling

## How It Works

### Config Plugin (Automatic)

The `cppBuildConfig.plugin.cjs` plugin runs during `expo prebuild` and:
1. Sets NDK version in `android/build.gradle`
2. Adds CMake flags in `android/app/build.gradle`
3. Patches CMakeLists.txt files

### Build Script (Automatic/Manual)

The `fix-cpp-build.cjs` script:
1. Verifies node_modules are installed
2. Cleans C++ build caches
3. Patches CMakeLists.txt files
4. Stops Gradle daemons

Runs automatically after `pnpm install` or manually with `pnpm run fix:cpp`.

## Success Indicators

Your fix is working when:

✅ `pnpm run fix:cpp` completes without errors
✅ `npx expo prebuild` succeeds
✅ `android/build.gradle` has `ndkVersion = "26.1.10909125"`
✅ `android/app/build.gradle` has CMake flags
✅ CMakeLists.txt files have `CMAKE_CXX_STANDARD 17`
✅ Android build completes successfully
✅ No "ninja: build stopped" errors

## Maintenance

### After Installing Dependencies

```bash
pnpm install
# Fix runs automatically via postinstall
```

### Before Building

```bash
# Optional: Clean Gradle
pnpm run gradle:clean

# Build
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

## Related Fixes

This project includes several build fixes:

- **C++ Build** (this fix) - Fixes C++17 compilation errors
- **FBJNI Fix** - Fixes duplicate fbjni classes
- **Reanimated Fix** - Fixes Reanimated build issues
- **Gradle Fix** - Fixes Gradle configuration

All work together for successful builds.

## Support

If you need help:

1. Check the error message in Gradle logs
2. Review `CPP_BUILD_FIX.md` for detailed troubleshooting
3. Verify Node version (18-22): `node --version`
4. Verify Android SDK: `echo $ANDROID_HOME`
5. Check NDK installation: `ls $ANDROID_HOME/ndk/`

## Summary

This fix ensures all C++ native modules use C++17 with proper NDK configuration, preventing build failures in React Native 0.81+ and Expo 54.

**Key Features:**
- ✅ Automated via config plugin
- ✅ Runs after install
- ✅ Manual execution available
- ✅ Comprehensive documentation
- ✅ Easy to verify and troubleshoot

**One Command to Rule Them All:**
```bash
pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

---

**Version**: 1.0.0
**Applies To**: React Native 0.81+, Expo 54+
**NDK Version**: 26.1.10909125
**C++ Standard**: C++17
