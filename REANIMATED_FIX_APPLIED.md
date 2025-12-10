
# React Native Reanimated Build Fix - Applied

## Issue
The Android build was failing with the error:
```
A problem occurred evaluating project ':react-native-reanimated'.
Process 'command 'node'' finished with non-zero exit value 1
```

This error occurs during the Gradle build process when Gradle tries to evaluate the react-native-reanimated project and encounters issues with Node execution.

## Root Causes
1. **Missing FBJNI Dependency**: React Native Reanimated requires the Facebook FBJNI library
2. **Gradle Configuration**: Missing packaging options and build flags for Reanimated
3. **SDK Version Compatibility**: Gradle 9 requires specific SDK versions
4. **Node Execution**: Gradle needs to execute Node scripts during the build process
5. **Babel Configuration**: Reanimated plugin must be the last plugin in Babel config

## Fixes Applied

### 1. Created Reanimated Config Plugin
**File**: `plugins/reanimatedConfig.plugin.cjs`

This plugin automatically configures:
- Adds `com.facebook.fbjni:fbjni-java-only:0.3.0` to `android/app/build.gradle`
- Adds `reanimatedEnablePackagingOptions = true` to `android/build.gradle`
- Configures packaging options to handle `.so` files
- Sets proper SDK versions (compileSdk=34, targetSdk=34, minSdk=21)
- Adds Kotlin version 1.9.22 for compatibility

### 2. Updated app.config.js
Added the new Reanimated config plugin to the plugins array:
```javascript
plugins: [
  // ... other plugins
  './plugins/reanimatedConfig.plugin.cjs',
  './plugins/gradleWrapperConfig.plugin.cjs',
  './plugins/androidWidget.plugin.js',
]
```

### 3. Enhanced fix-reanimated-build.cjs Script
The script now:
- Checks Node.js version (must be 18-22)
- Verifies react-native-reanimated installation
- Checks babel.config.cjs for the Reanimated plugin
- Stops Gradle daemons
- Cleans Gradle cache
- Removes android/ios folders
- Runs prebuild with proper environment variables

### 4. Updated metro.config.js
Enhanced Metro configuration:
- Added proper Babel transformer path
- Configured transformer options for Reanimated
- Increased watcher timeout for large projects

### 5. Babel Configuration (Already Correct)
**File**: `babel.config.cjs`

The Reanimated plugin is correctly placed as the LAST plugin:
```javascript
plugins: [
  '@babel/plugin-proposal-export-namespace-from',
  'babel-plugin-module-resolver',
  'react-native-reanimated/plugin', // MUST be last
]
```

## How to Use

### Option 1: Automated Fix (Recommended)
Run the automated fix script:
```bash
npm run fix:reanimated
```

This will:
1. Check your Node.js version
2. Verify Reanimated installation
3. Clean Gradle cache
4. Remove android/ios folders
5. Run prebuild with proper configuration
6. Apply all necessary fixes

### Option 2: Manual Steps
If you prefer to do it manually:

```bash
# 1. Stop Gradle daemons
npm run gradle:stop

# 2. Clean Gradle cache
npm run gradle:clean

# 3. Remove android and ios folders
rm -rf android ios

# 4. Run prebuild
npm run prebuild:android

# 5. Build the app
npm run android
```

## What the Plugin Does Automatically

When you run `expo prebuild`, the Reanimated config plugin will:

1. **Modify android/app/build.gradle**:
   ```gradle
   dependencies {
       implementation 'com.facebook.fbjni:fbjni-java-only:0.3.0'
   }
   
   android {
       packagingOptions {
           pickFirst '**/*.so'
           pickFirst '**/libc++_shared.so'
           pickFirst '**/libfbjni.so'
       }
   }
   ```

2. **Modify android/build.gradle**:
   ```gradle
   buildscript {
       ext {
           reanimatedEnablePackagingOptions = true
           buildToolsVersion = "34.0.0"
           minSdkVersion = 21
           compileSdkVersion = 34
           targetSdkVersion = 34
           kotlinVersion = "1.9.22"
       }
   }
   ```

3. **Modify android/gradle.properties**:
   ```properties
   reanimated.enablePackagingOptions=true
   android.enableJetifier=true
   android.useAndroidX=true
   ```

## Verification

After applying the fix, verify that:

1. ✅ Node.js version is between 18 and 22
2. ✅ `react-native-reanimated` is installed in node_modules
3. ✅ `babel.config.cjs` has `react-native-reanimated/plugin` as the last plugin
4. ✅ `app.config.js` includes the Reanimated config plugin
5. ✅ Android build completes without errors

## Troubleshooting

### If the build still fails:

1. **Check Node version**:
   ```bash
   node --version
   ```
   Should be v18.x.x, v19.x.x, v20.x.x, v21.x.x, or v22.x.x

2. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Clear all caches**:
   ```bash
   npm run gradle:stop
   npm run gradle:clean
   rm -rf android ios
   npx expo prebuild --clean
   ```

4. **Check for conflicting .so files**:
   The packaging options should handle this, but if you see errors about duplicate .so files, the plugin will automatically add the necessary `pickFirst` rules.

5. **Verify Gradle version**:
   The project uses Gradle 8.14.3, which is compatible with React Native 0.81.4 and Reanimated 4.1.0.

## Technical Details

### Why FBJNI is Required
React Native Reanimated uses native code that depends on Facebook's FBJNI (Facebook Java Native Interface) library. This library provides the bridge between Java and C++ code.

### Why Packaging Options are Needed
Multiple libraries may include the same `.so` (shared object) files. The `pickFirst` directive tells Gradle to use the first occurrence and ignore duplicates, preventing build conflicts.

### Why SDK Versions Matter
Gradle 9 has stricter requirements for SDK versions. Using compileSdk=34 and targetSdk=34 ensures compatibility with the latest Android features and Gradle requirements.

### Why Reanimated Plugin Must Be Last
The Reanimated Babel plugin performs transformations that must happen after all other plugins. Placing it last ensures that all code is properly transformed for Reanimated's worklet support.

## Success Indicators

After running the fix, you should see:
- ✅ Gradle build completes without errors
- ✅ No "Process 'command 'node'' finished with non-zero exit value 1" errors
- ✅ App builds and runs on Android device/emulator
- ✅ Reanimated animations work correctly

## Additional Resources

- [React Native Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Gradle Build Configuration](https://developer.android.com/build)

## Notes

- This fix is automatically applied during `expo prebuild`
- No manual editing of Android files is required
- The plugin is safe and will not break existing configurations
- All changes are applied through Expo config plugins for maintainability
