
# C++ Build Fix for React Native 0.81+ and Expo 54

## Problem

You're encountering a C++ build failure from `react-native-gesture-handler`:

```
3 errors generated.
ninja: build stopped: subcommand failed.
C++ build system [build] failed
```

This happens in:
```
node_modules/react-native-gesture-handler/android/.cxx/.../arm64-v8a/gesturehandler
```

## Root Cause

React Native 0.81+ uses a newer C++ toolchain that requires C++17 standard. However, `react-native-gesture-handler` and other native modules still default to C++14 unless explicitly configured. This mismatch causes clang++ compilation errors and makes ninja fail.

## Solution Applied

We've implemented a comprehensive fix using Expo config plugins and build scripts:

### 1. Config Plugin: `plugins/cppBuildConfig.plugin.cjs`

This plugin automatically applies the following fixes during `expo prebuild`:

#### ✅ Forces NDK version 26.1.10909125
In `android/build.gradle` (project level):
```gradle
buildscript {
    ext {
        ndkVersion = "26.1.10909125"
    }
}
```

#### ✅ Adds CMake flags for C++17
In `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        externalNativeBuild {
            cmake {
                cppFlags "-std=c++17 -frtti -fexceptions"
                arguments "-DANDROID_STL=c++_shared"
            }
        }
    }
}
```

#### ✅ Patches CMakeLists.txt files
For `react-native-gesture-handler`, `react-native-reanimated`, and `react-native-yoga`:
```cmake
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti -fexceptions")
```

### 2. Build Script: `scripts/fix-cpp-build.cjs`

This script performs additional cleanup and verification:

- ✅ Cleans C++ build caches (`.cxx` folders)
- ✅ Patches CMakeLists.txt files in node_modules
- ✅ Verifies all required libraries are installed
- ✅ Stops Gradle daemons to prevent cache conflicts

## How to Use

### Quick Fix (Recommended)

Run the automated fix script:

```bash
pnpm run fix:cpp
```

This will:
1. Verify node_modules are installed
2. Clean all C++ build caches
3. Patch CMakeLists.txt files for C++17
4. Stop Gradle daemons

### Full Rebuild

After running the fix script, rebuild your project:

```bash
# Clean prebuild
npx expo prebuild --clean

# Build for Android
pnpm run android
# OR
npx expo run:android
```

### Manual Steps (If Needed)

If the automated fix doesn't work, you can manually apply these steps:

#### 1. Clean C++ Caches

```bash
rm -rf android/.cxx
rm -rf node_modules/react-native-gesture-handler/android/.cxx
rm -rf node_modules/react-native-reanimated/android/.cxx
rm -rf node_modules/react-native-yoga/android/.cxx
```

#### 2. Stop Gradle Daemons

```bash
cd android && ./gradlew --stop
```

#### 3. Clean Gradle Cache

```bash
cd android && ./gradlew clean --no-daemon
```

#### 4. Rebuild

```bash
npx expo prebuild --clean
pnpm run android
```

## Verification

After applying the fix, verify the configuration:

### Check NDK Version

In `android/build.gradle`:
```gradle
ext {
    ndkVersion = "26.1.10909125"
}
```

### Check CMake Flags

In `android/app/build.gradle`:
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
cmake_minimum_required(VERSION 3.13)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti -fexceptions")
```

## Troubleshooting

### Build Still Fails

1. **Verify NDK Installation**
   ```bash
   # Check if NDK 26.1.10909125 is installed
   ls $ANDROID_HOME/ndk/
   ```

2. **Clean Everything**
   ```bash
   pnpm run gradle:stop
   pnpm run gradle:clean
   rm -rf android ios
   pnpm install
   pnpm run fix:cpp
   npx expo prebuild --clean
   ```

3. **Check Node Version**
   ```bash
   node --version
   # Should be between 18 and 22
   ```

4. **Verify Gradle Properties**
   Check `android/gradle.properties` for:
   ```properties
   android.useAndroidX=true
   android.enableJetifier=true
   ```

### CMakeLists.txt Changes Don't Persist

The CMakeLists.txt files are in `node_modules`, so they'll be reset when you run `pnpm install`. To persist changes:

1. Run `pnpm run fix:cpp` after every `pnpm install`
2. Or add it to your postinstall script (already configured)

### Gradle Daemon Issues

If you see "Gradle daemon" errors:
```bash
cd android && ./gradlew --stop
cd android && ./gradlew clean --no-daemon
```

## Technical Details

### Why C++17?

React Native 0.81+ uses modern C++ features that require C++17:
- `std::optional`
- `std::variant`
- `if constexpr`
- Structured bindings

### Why RTTI and Exceptions?

- **RTTI** (`-frtti`): Required for `dynamic_cast` and `typeid` in React Native's C++ bridge
- **Exceptions** (`-fexceptions`): Required for proper error handling in native modules

### Why NDK 26.1.10909125?

This is the recommended NDK version for React Native 0.81+ that includes:
- Clang 17.0.2 with full C++17 support
- Updated STL with C++17 features
- Better compatibility with Gradle 8+

## Related Issues

- React Native Gesture Handler: https://github.com/software-mansion/react-native-gesture-handler/issues
- React Native Reanimated: https://github.com/software-mansion/react-native-reanimated/issues
- Expo SDK 54: https://docs.expo.dev/versions/latest/

## Additional Resources

- [React Native C++ Guide](https://reactnative.dev/docs/native-modules-android)
- [CMake Documentation](https://cmake.org/documentation/)
- [Android NDK Guide](https://developer.android.com/ndk/guides)

## Summary

This fix ensures that all C++ native modules in your Expo 54 project use the same C++17 standard, preventing compilation errors and build failures. The config plugin automatically applies these settings during prebuild, and the build script provides additional cleanup and verification.

**Key Points:**
- ✅ NDK version locked to 26.1.10909125
- ✅ CMake configured for C++17 with RTTI and exceptions
- ✅ All native modules patched for consistent C++ standard
- ✅ Automated scripts for easy application and verification

If you continue to experience issues, please check the Gradle build logs for specific error messages and refer to the troubleshooting section above.
