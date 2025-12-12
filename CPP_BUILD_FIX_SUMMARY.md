
# C++ Build Fix Summary

## What Was Done

We've implemented a comprehensive fix for C++ build failures in React Native 0.81+ with Expo 54. The solution includes:

### 1. New Config Plugin: `plugins/cppBuildConfig.plugin.cjs`

This plugin automatically configures your Android build for C++17 compatibility:

- **NDK Version**: Forces NDK 26.1.10909125 in project `build.gradle`
- **CMake Flags**: Adds `-std=c++17 -frtti -fexceptions` in app `build.gradle`
- **CMakeLists Patching**: Updates CMakeLists.txt files for native modules

The plugin is registered in `app.config.js` and runs automatically during `expo prebuild`.

### 2. New Build Script: `scripts/fix-cpp-build.cjs`

This script provides additional cleanup and verification:

- Cleans C++ build caches (`.cxx` folders)
- Patches CMakeLists.txt files in node_modules
- Verifies required libraries are installed
- Stops Gradle daemons to prevent conflicts

Run with: `pnpm run fix:cpp`

### 3. Updated Package Scripts

Added new npm scripts for convenience:

```json
{
  "fix:cpp": "node scripts/fix-cpp-build.cjs",
  "postinstall": "node scripts/fix-cpp-build.cjs || echo '...'"
}
```

The fix runs automatically after `pnpm install`.

### 4. Documentation

Created comprehensive documentation:

- **CPP_BUILD_FIX.md**: Detailed technical documentation
- **QUICK_FIX_CPP_BUILD.md**: Quick reference guide
- **BUILD_TROUBLESHOOTING.md**: Updated with C++ build section

## How It Works

### During Prebuild (Automatic)

When you run `npx expo prebuild`, the config plugin:

1. Modifies `android/build.gradle` to set NDK version
2. Modifies `android/app/build.gradle` to add CMake flags
3. Attempts to patch CMakeLists.txt files in node_modules

### After Install (Automatic)

When you run `pnpm install`, the postinstall script:

1. Verifies all required libraries are present
2. Cleans old C++ build caches
3. Patches CMakeLists.txt files for C++17
4. Stops Gradle daemons

### Manual Execution

You can run the fix manually anytime:

```bash
pnpm run fix:cpp
```

## What Gets Fixed

### 1. NDK Version Mismatch

**Before:**
```gradle
// No NDK version specified, uses default
```

**After:**
```gradle
buildscript {
    ext {
        ndkVersion = "26.1.10909125"
    }
}
```

### 2. Missing CMake Flags

**Before:**
```gradle
defaultConfig {
    // No externalNativeBuild configuration
}
```

**After:**
```gradle
defaultConfig {
    externalNativeBuild {
        cmake {
            cppFlags "-std=c++17 -frtti -fexceptions"
            arguments "-DANDROID_STL=c++_shared"
        }
    }
}
```

### 3. CMakeLists.txt C++ Standard

**Before:**
```cmake
cmake_minimum_required(VERSION 3.13)
# No C++ standard specified, defaults to C++14
```

**After:**
```cmake
cmake_minimum_required(VERSION 3.13)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti -fexceptions")
```

## Usage

### First Time Setup

```bash
# Install dependencies
pnpm install

# The postinstall script runs automatically and applies the fix

# Prebuild with clean slate
npx expo prebuild --clean

# Build for Android
pnpm run android
```

### After Updating Dependencies

```bash
# Install new dependencies
pnpm install

# The postinstall script runs automatically

# If you encounter issues, run manually
pnpm run fix:cpp

# Rebuild
npx expo prebuild --clean
pnpm run android
```

### When Build Fails

```bash
# Run the fix
pnpm run fix:cpp

# Clean prebuild
npx expo prebuild --clean

# Try building again
pnpm run android
```

## Verification

### Check Config Plugin is Active

In `app.config.js`, verify:
```javascript
plugins: [
  // ... other plugins
  './plugins/cppBuildConfig.plugin.cjs',
],
```

### Check NDK Version

After prebuild, in `android/build.gradle`:
```gradle
ext {
    ndkVersion = "26.1.10909125"
}
```

### Check CMake Flags

After prebuild, in `android/app/build.gradle`:
```gradle
externalNativeBuild {
    cmake {
        cppFlags "-std=c++17 -frtti -fexceptions"
    }
}
```

### Check CMakeLists.txt

In `node_modules/react-native-gesture-handler/android/CMakeLists.txt`:
```cmake
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti -fexceptions")
```

## Troubleshooting

### Fix Script Fails

If `pnpm run fix:cpp` fails:

1. Check that node_modules exists: `ls node_modules`
2. Verify required libraries: `ls node_modules/react-native-gesture-handler`
3. Run with verbose output: `node scripts/fix-cpp-build.cjs`

### Build Still Fails After Fix

1. **Clean everything:**
   ```bash
   pnpm run gradle:stop
   pnpm run gradle:clean
   rm -rf android ios
   pnpm install
   npx expo prebuild --clean
   ```

2. **Verify NDK installation:**
   ```bash
   ls $ANDROID_HOME/ndk/
   # Should show 26.1.10909125
   ```

3. **Check Node version:**
   ```bash
   node --version
   # Should be 18.x - 22.x
   ```

### CMakeLists.txt Changes Don't Persist

The CMakeLists.txt files are in `node_modules`, so they reset on `pnpm install`. This is expected and handled by:

1. The postinstall script (runs automatically)
2. The config plugin (runs during prebuild)
3. Manual execution: `pnpm run fix:cpp`

## Technical Details

### Why C++17?

React Native 0.81+ uses modern C++ features:
- `std::optional`
- `std::variant`
- `if constexpr`
- Structured bindings

These require C++17 or later.

### Why RTTI and Exceptions?

- **RTTI** (`-frtti`): Required for `dynamic_cast` and `typeid` in React Native's C++ bridge
- **Exceptions** (`-fexceptions`): Required for proper error handling in native modules

### Why This NDK Version?

NDK 26.1.10909125 includes:
- Clang 17.0.2 with full C++17 support
- Updated STL with C++17 features
- Better compatibility with Gradle 8+
- Recommended for React Native 0.81+

## Files Modified

### Created
- `plugins/cppBuildConfig.plugin.cjs` - Config plugin for C++ build settings
- `scripts/fix-cpp-build.cjs` - Build script for cleanup and patching
- `CPP_BUILD_FIX.md` - Detailed documentation
- `QUICK_FIX_CPP_BUILD.md` - Quick reference guide
- `CPP_BUILD_FIX_SUMMARY.md` - This file

### Modified
- `app.config.js` - Added cppBuildConfig plugin
- `package.json` - Added fix:cpp script and updated postinstall
- `BUILD_TROUBLESHOOTING.md` - Added C++ build section

### Generated (During Prebuild)
- `android/build.gradle` - NDK version set
- `android/app/build.gradle` - CMake flags added

### Patched (During Fix Script)
- `node_modules/react-native-gesture-handler/android/CMakeLists.txt`
- `node_modules/react-native-reanimated/android/CMakeLists.txt`
- `node_modules/react-native-yoga/android/CMakeLists.txt`

## Success Indicators

Your build is working correctly when:

✅ `pnpm run fix:cpp` completes without errors
✅ `npx expo prebuild` generates android folder successfully
✅ `android/build.gradle` contains `ndkVersion = "26.1.10909125"`
✅ `android/app/build.gradle` contains CMake flags
✅ CMakeLists.txt files have `CMAKE_CXX_STANDARD 17`
✅ Android build completes without C++ errors
✅ No "ninja: build stopped" errors

## Prevention

To avoid future C++ build issues:

1. **Always run fix after install**: The postinstall script handles this
2. **Use correct Node version**: 18.x - 22.x
3. **Keep NDK updated**: Use NDK 26.1.10909125 or later
4. **Clean before major builds**: Run `pnpm run gradle:clean`
5. **Prebuild with --clean**: Use `npx expo prebuild --clean`

## Related Fixes

This fix complements other build fixes in the project:

- **FBJNI Fix**: `plugins/fbjniExclusion.plugin.cjs` - Fixes duplicate fbjni classes
- **Reanimated Fix**: `plugins/reanimatedConfig.plugin.cjs` - Fixes Reanimated build issues
- **Gradle Fix**: `plugins/gradleWrapperConfig.plugin.cjs` - Fixes Gradle configuration

All these plugins work together to ensure successful Android builds.

## Support

If you continue to experience issues:

1. Check the Gradle build logs for specific errors
2. Review `CPP_BUILD_FIX.md` for detailed troubleshooting
3. Verify all config plugins are active in `app.config.js`
4. Ensure you're using compatible versions of React Native and Expo

## Summary

This fix ensures that all C++ native modules in your Expo 54 project use the same C++17 standard with proper NDK configuration, preventing compilation errors and build failures. The solution is automated through config plugins and build scripts, making it easy to apply and maintain.

**Key Benefits:**
- ✅ Automated fix through config plugins
- ✅ Runs automatically after install
- ✅ Manual execution available
- ✅ Comprehensive documentation
- ✅ Compatible with Expo 54 and React Native 0.81+
