
# FBJNI Duplicate Classes Fix

## Problem

The Android build fails with duplicate class errors:

```
Duplicate class com.facebook.jni.CppException found in modules:
- fbjni-0.7.0.aar -> jetified-fbjni-0.7.0-runtime (com.facebook.fbjni:fbjni:0.7.0)
- fbjni-java-only-0.3.0.jar -> jetified-fbjni-java-only-0.3.0 (com.facebook.fbjni:fbjni-java-only:0.3.0)
```

## Root Cause

The issue occurs because:

1. React Native libraries (like `react-native-reanimated`) depend on `fbjni:0.7.0`
2. Some older configurations add `fbjni-java-only:0.3.0` as a separate dependency
3. Both libraries contain the same classes, causing a conflict during the build

## Solution Applied

### 1. Created `fbjniExclusion.plugin.cjs`

This Expo config plugin:
- Removes any existing `fbjni-java-only:0.3.0` dependencies
- Adds a global exclusion for `fbjni-java-only` in `android/app/build.gradle`
- Applies explicit exclusions to known React Native libraries

### 2. Updated `reanimatedConfig.plugin.cjs`

Removed the line that was adding `fbjni-java-only:0.3.0` as a dependency.

### 3. Updated `app.config.js`

Added the new `fbjniExclusion.plugin.cjs` as the first Android-related plugin to ensure it runs before other plugins.

## How It Works

The plugin modifies `android/app/build.gradle` to:

1. Add a global exclusion:
```gradle
configurations.all {
    exclude group: 'com.facebook.fbjni', module: 'fbjni-java-only'
}
```

2. Apply exclusions to specific libraries:
```gradle
implementation(project(':react-native-reanimated')) {
    exclude group: 'com.facebook.fbjni', module: 'fbjni-java-only'
}
```

## Steps to Apply the Fix

1. **Clean the project:**
   ```bash
   pnpm run gradle:stop
   pnpm run gradle:clean
   rm -rf android ios
   ```

2. **Reinstall dependencies:**
   ```bash
   pnpm install --shamefully-hoist
   ```

3. **Run prebuild:**
   ```bash
   pnpm run prebuild:android
   ```

4. **Build the app:**
   ```bash
   pnpm run android
   ```

## Verification

After running prebuild, check `android/app/build.gradle` for:

1. The global exclusion block under the `android` section
2. Exclusions applied to React Native library dependencies
3. No `implementation 'com.facebook.fbjni:fbjni-java-only:0.3.0'` lines

## Troubleshooting

### If the build still fails:

1. **Check Gradle cache:**
   ```bash
   cd android
   ./gradlew clean --no-daemon
   ./gradlew --stop
   cd ..
   ```

2. **Verify plugin order in app.config.js:**
   The `fbjniExclusion.plugin.cjs` should be listed before `reanimatedConfig.plugin.cjs`.

3. **Check for manual modifications:**
   If you've manually modified `android/app/build.gradle`, the plugin might not apply correctly. Run `expo prebuild --clean` to regenerate.

4. **Verify Node version:**
   Ensure you're using Node 18-22:
   ```bash
   node --version
   ```

## Related Files

- `plugins/fbjniExclusion.plugin.cjs` - Main fix plugin
- `plugins/reanimatedConfig.plugin.cjs` - Updated to remove fbjni-java-only dependency
- `app.config.js` - Plugin configuration
- `scripts/check-plugins.cjs` - Plugin verification script

## Additional Resources

- [Android Dependency Resolution](https://d.android.com/r/tools/classpath-sync-errors)
- [Gradle Dependency Management](https://docs.gradle.org/current/userguide/dependency_management.html)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)
