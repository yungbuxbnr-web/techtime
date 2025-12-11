
# Android Build Fix - Complete Solution

## Issues Fixed

### 1. Duplicate FBJNI Classes
**Error:**
```
Duplicate class com.facebook.jni.* found in modules:
- fbjni-0.7.0.aar (com.facebook.fbjni:fbjni:0.7.0)
- fbjni-java-only-0.3.0.jar (com.facebook.fbjni:fbjni-java-only:0.3.0)
```

**Solution:**
- Created `plugins/fbjniExclusion.plugin.cjs` to exclude `fbjni-java-only` globally
- Updated `plugins/reanimatedConfig.plugin.cjs` to remove the conflicting dependency
- Added the plugin to `app.config.js` plugin chain

### 2. React Native Reanimated Build Issues
**Error:**
```
Process 'command 'node'' finished with non-zero exit value 1
```

**Solution:**
- Set `NODE_BINARY` in gradle.properties via config plugin
- Added proper packaging options for `.so` files
- Configured Gradle memory settings for large builds

## Files Modified

### New Files
- `plugins/fbjniExclusion.plugin.cjs` - Excludes duplicate fbjni classes
- `FBJNI_DUPLICATE_FIX.md` - Detailed documentation

### Updated Files
- `plugins/reanimatedConfig.plugin.cjs` - Removed fbjni-java-only dependency
- `app.config.js` - Added fbjniExclusion plugin
- `scripts/check-plugins.cjs` - Added fbjniExclusion to verification
- `scripts/fix-reanimated-build.cjs` - Added fbjni verification steps

## How to Apply the Fix

### Quick Fix (Recommended)
```bash
pnpm run fix:build
```

This automated script will:
1. Verify Node.js version (18-22)
2. Check all dependencies and plugins
3. Clean Gradle cache
4. Remove android/ios folders
5. Reinstall dependencies with hoisting
6. Run expo prebuild
7. Verify all configurations

### Manual Fix
If you prefer to run steps manually:

```bash
# 1. Stop Gradle daemons
cd android && ./gradlew --stop && cd ..

# 2. Clean everything
rm -rf android ios
cd android && ./gradlew clean --no-daemon && cd ..

# 3. Reinstall dependencies
pnpm install --shamefully-hoist

# 4. Run prebuild
pnpm run prebuild:android

# 5. Build the app
pnpm run android
```

## Verification Checklist

After running the fix, verify:

- [ ] `android/gradle.properties` contains `NODE_BINARY=<path>`
- [ ] `android/app/build.gradle` has `configurations.all` exclusion block
- [ ] `android/app/build.gradle` has no `fbjni-java-only:0.3.0` dependency
- [ ] `babel.config.cjs` has `react-native-reanimated/plugin` as last plugin
- [ ] All plugins exist in `plugins/` folder

## Plugin Order in app.config.js

The plugins are applied in this order:
1. `fbjniExclusion.plugin.cjs` - First to exclude duplicates
2. `reanimatedConfig.plugin.cjs` - Configure Reanimated
3. `gradleWrapperConfig.plugin.cjs` - Configure Gradle settings
4. `androidWidget.plugin.js` - Add widget support

**Important:** The order matters! `fbjniExclusion` must run before `reanimatedConfig`.

## What Each Plugin Does

### fbjniExclusion.plugin.cjs
- Removes any existing `fbjni-java-only:0.3.0` dependencies
- Adds global exclusion: `configurations.all { exclude ... }`
- Applies exclusions to specific React Native libraries

### reanimatedConfig.plugin.cjs
- Sets `NODE_BINARY` in gradle.properties
- Adds packaging options for `.so` files
- Enables `reanimatedEnablePackagingOptions`
- Sets proper SDK versions (34)

### gradleWrapperConfig.plugin.cjs
- Configures Gradle memory (6GB JVM heap)
- Sets network timeouts
- Configures daemon settings (CI vs local)
- Enables AndroidX and Jetifier

## Troubleshooting

### Build still fails with duplicate classes
1. Check if `android/app/build.gradle` has the exclusion blocks
2. Run `pnpm run prebuild:android` to regenerate
3. Verify plugin order in `app.config.js`

### Node not found during build
1. Check `android/gradle.properties` for `NODE_BINARY`
2. Verify Node is in PATH: `which node`
3. Set manually if needed: `NODE_BINARY=/usr/local/bin/node`

### Out of memory errors
1. Check `android/gradle.properties` has `org.gradle.jvmargs=-Xmx6144m`
2. Close other applications
3. Increase memory in `gradleWrapperConfig.plugin.cjs`

### Modules not found
1. Run `pnpm install --shamefully-hoist`
2. Check `.npmrc` has hoisting enabled
3. Delete `node_modules` and reinstall

## Testing the Build

After applying the fix:

```bash
# Development build
pnpm run android

# Release build
pnpm run build:android

# EAS build
pnpm run build:eas:android
```

## Additional Resources

- [FBJNI_DUPLICATE_FIX.md](./FBJNI_DUPLICATE_FIX.md) - Detailed fbjni fix
- [REANIMATED_BUILD_FIX.md](./REANIMATED_BUILD_FIX.md) - Reanimated configuration
- [BUILD_TROUBLESHOOTING.md](./BUILD_TROUBLESHOOTING.md) - General troubleshooting

## Success Indicators

You'll know the fix worked when:
- ✅ Build completes without duplicate class errors
- ✅ No "Process 'command 'node'' finished with non-zero exit value 1" errors
- ✅ App runs successfully on Android device/emulator
- ✅ Reanimated animations work correctly

## Support

If you continue to experience issues:
1. Check the Gradle error log in `android/build/reports/problems/`
2. Run with verbose logging: `cd android && ./gradlew assembleRelease --stacktrace`
3. Verify all plugins are correctly configured
4. Check Node version compatibility (18-22)
