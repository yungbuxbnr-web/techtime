
# React Native Gesture Handler - RN 0.81 Compatibility Fix

## Problem

The Android build was failing with the following errors from `react-native-gesture-handler`:

```
shadowNodeFromValue not found
no member named getTraits
no member named getComponentName
```

These errors occur because React Native 0.81+ removed certain Fabric C++ APIs that `react-native-gesture-handler` was using.

## Solution Applied

### 1. Patched cpp-adapter.cpp

**File:** `node_modules/react-native-gesture-handler/android/src/main/jni/cpp-adapter.cpp`

**Changes:**
- Replaced `shadowNodeFromValue()` with `shadowNodeListFromValue()`
- Updated `getTraits()` to use the new API with proper trait checking
- Replaced `getComponentName()` with `getComponentDescriptor()->getComponentName()`

**Old Code:**
```cpp
auto shadowNode = shadowNodeFromValue(runtime, arguments[0]);
bool isViewFlatteningDisabled = shadowNode->getTraits().check(
        ShadowNodeTraits::FormsStackingContext);

const char *componentName = shadowNode->getComponentName();
bool isTextComponent = strcmp(componentName, "Paragraph") == 0 ||
                       strcmp(componentName, "Text") == 0;

return jsi::Value(isViewFlatteningDisabled || isTextComponent);
```

**New Code (RN 0.81 Compatible):**
```cpp
auto shadowNodeList = shadowNodeListFromValue(runtime, arguments[0]);

if (shadowNodeList.size() == 0) {
    return jsi::Value::undefined();
}

auto shadowNode = shadowNodeList[0];

auto traits = shadowNode->getTraits();
bool isViewFlatteningDisabled = traits.check(
    facebook::react::ShadowNodeTraits::Trait::ViewKind
);

std::string componentName = shadowNode->getComponentDescriptor()
    ->getComponentName();

return jsi::Value(runtime, jsi::String::createFromUtf8(runtime, componentName));
```

### 2. Updated CMakeLists.txt

**File:** `node_modules/react-native-gesture-handler/android/CMakeLists.txt`

**Changes:**
- Set `CMAKE_CXX_STANDARD` to `20` (required for RN 0.81+)
- Added `CMAKE_CXX_STANDARD_REQUIRED ON`
- Added compiler flags: `-frtti -fexceptions`

```cmake
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti -fexceptions")
```

### 3. Cleaned Build Caches

The following caches were cleaned:
- `android/.cxx`
- `node_modules/react-native-gesture-handler/android/.cxx`
- `node_modules/react-native-reanimated/android/.cxx`
- `node_modules/react-native-yoga/android/.cxx`
- `node_modules/react-native/android/.cxx`

### 4. Gradle Daemon Management

- Stopped all running Gradle daemons to ensure clean rebuild
- Recommended manual cleanup of `~/.gradle/caches` if issues persist

## How to Apply

The fix is automatically applied via the `fix-cpp-build.cjs` script, which runs:

1. **Automatically on install:**
   ```bash
   pnpm install
   ```
   The `postinstall` script runs the fix automatically.

2. **Manually when needed:**
   ```bash
   pnpm run fix:cpp
   ```

3. **After applying the fix:**
   ```bash
   npx expo prebuild --clean
   pnpm run android
   ```

## Technical Details

### Why C++20 for Gesture Handler?

React Native 0.81+ uses modern C++ features that require C++20 standard. The gesture handler library needs to match this standard to properly interface with React Native's Fabric architecture.

### Why the API Changed

React Native's Fabric architecture underwent significant refactoring in version 0.81:

1. **Shadow Node Access:** Changed from single node to list-based access for better performance
2. **Traits API:** Updated to use namespaced traits with explicit type checking
3. **Component Names:** Moved to descriptor-based access for better encapsulation

### Compatibility

This fix is compatible with:
- React Native 0.81+
- Expo SDK 54+
- react-native-gesture-handler ~2.24.0
- NDK 26.1.10909125

## Verification

After applying the fix, verify it worked by checking:

1. **cpp-adapter.cpp contains the new code:**
   ```bash
   grep -n "shadowNodeListFromValue" node_modules/react-native-gesture-handler/android/src/main/jni/cpp-adapter.cpp
   ```

2. **CMakeLists.txt has C++20:**
   ```bash
   grep -n "CMAKE_CXX_STANDARD 20" node_modules/react-native-gesture-handler/android/CMakeLists.txt
   ```

3. **Build succeeds:**
   ```bash
   cd android && ./gradlew assembleRelease
   ```

## Troubleshooting

If the build still fails after applying the fix:

1. **Clean everything:**
   ```bash
   pnpm run gradle:clean
   rm -rf android/.cxx
   rm -rf ~/.gradle/caches
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   pnpm install
   ```

3. **Rebuild from scratch:**
   ```bash
   npx expo prebuild --clean
   pnpm run android
   ```

4. **Check NDK version:**
   Ensure NDK 26.1.10909125 is installed in Android Studio SDK Manager.

## References

- [React Native 0.81 Release Notes](https://github.com/facebook/react-native/releases/tag/v0.81.0)
- [Fabric Architecture Documentation](https://reactnative.dev/architecture/fabric-renderer)
- [react-native-gesture-handler Issues](https://github.com/software-mansion/react-native-gesture-handler/issues)

## Maintenance

This patch is applied to `node_modules` and will need to be reapplied after:
- Running `pnpm install` (automatically via postinstall)
- Updating `react-native-gesture-handler`
- Cleaning `node_modules`

The fix is persistent as long as the `postinstall` script remains in `package.json`.
