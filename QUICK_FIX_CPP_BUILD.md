
# Quick Fix: C++ Build Failure

## Error
```
3 errors generated.
ninja: build stopped: subcommand failed.
C++ build system [build] failed
```

## One-Command Fix

```bash
pnpm run fix:cpp && npx expo prebuild --clean && pnpm run android
```

## What This Does

1. **Cleans C++ caches** - Removes old `.cxx` build artifacts
2. **Patches CMakeLists.txt** - Updates gesture-handler, reanimated, yoga to use C++17
3. **Stops Gradle daemons** - Prevents cache conflicts
4. **Rebuilds project** - Regenerates Android folder with correct config
5. **Builds app** - Compiles with proper C++17 toolchain

## Step-by-Step (If One-Command Fails)

### 1. Run the Fix Script
```bash
pnpm run fix:cpp
```

### 2. Clean Prebuild
```bash
npx expo prebuild --clean
```

### 3. Build Android
```bash
pnpm run android
```

## What Was Fixed

✅ **NDK Version**: Locked to 26.1.10909125 (via config plugin)
✅ **CMake Flags**: Added `-std=c++17 -frtti -fexceptions` (via config plugin)
✅ **CMakeLists.txt**: Patched for C++17 in gesture-handler, reanimated, yoga
✅ **Build Caches**: Cleaned all `.cxx` folders

## Still Failing?

### Clean Everything
```bash
pnpm run gradle:stop
pnpm run gradle:clean
rm -rf android ios node_modules
pnpm install
pnpm run fix:cpp
npx expo prebuild --clean
pnpm run android
```

### Check NDK Installation
```bash
# Verify NDK 26.1.10909125 is installed
ls $ANDROID_HOME/ndk/
```

If not installed, Android Studio will download it automatically during build.

### Check Node Version
```bash
node --version
# Must be 18.x, 19.x, 20.x, 21.x, or 22.x
```

## Why This Happens

React Native 0.81+ requires C++17, but some native modules default to C++14. This causes compilation errors. Our fix ensures all modules use C++17 consistently.

## Automatic Fix

The fix runs automatically after `pnpm install`, but you can run it manually anytime:

```bash
pnpm run fix:cpp
```

## More Info

See `CPP_BUILD_FIX.md` for detailed technical information.
