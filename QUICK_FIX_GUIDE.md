
# Quick Fix Guide - React Native Reanimated Build Error

## The Error
```
A problem occurred evaluating project ':react-native-reanimated'.
Process 'command 'node'' finished with non-zero exit value 1
```

## Quick Fix (One Command)

```bash
npm run fix:reanimated
```

This automated script will:
- ✅ Check your Node.js version
- ✅ Verify Reanimated installation
- ✅ Verify Babel configuration
- ✅ Stop Gradle daemons
- ✅ Clean Gradle cache
- ✅ Remove android/ios folders
- ✅ Run prebuild with proper configuration
- ✅ Apply all necessary fixes automatically

## What Was Fixed

### 1. Reanimated Config Plugin
A new plugin (`plugins/reanimatedConfig.plugin.cjs`) was created that automatically:
- Adds FBJNI dependency to app/build.gradle
- Configures packaging options for .so files
- Sets reanimatedEnablePackagingOptions flag
- Updates SDK versions for Gradle 9 compatibility

### 2. App Configuration
Updated `app.config.js` to include the Reanimated config plugin in the plugins array.

### 3. Metro Configuration
Enhanced `metro.config.js` with proper Babel transformer configuration for Reanimated.

### 4. Build Scripts
Updated build scripts to ensure proper environment setup and error handling.

## Manual Steps (If Needed)

If the automated fix doesn't work, try these manual steps:

```bash
# 1. Check Node version (must be 18-22)
node --version

# 2. Stop Gradle daemons
npm run gradle:stop

# 3. Clean Gradle cache
npm run gradle:clean

# 4. Remove android and ios folders
rm -rf android ios

# 5. Run prebuild
npm run prebuild:android

# 6. Build the app
npm run android
```

## Verification Checklist

After running the fix, verify:

- [ ] Node.js version is between 18 and 22
- [ ] `react-native-reanimated` is in node_modules
- [ ] `babel.config.cjs` has `react-native-reanimated/plugin` as last plugin
- [ ] `app.config.js` includes `./plugins/reanimatedConfig.plugin.cjs`
- [ ] Android build completes without errors

## Common Issues

### Issue: Node version incompatible
**Solution**: Install Node 18, 20, or 22
```bash
nvm install 18
nvm use 18
```

### Issue: Gradle cache locked
**Solution**: Stop all Gradle processes
```bash
npm run gradle:stop
npm run gradle:clean
```

### Issue: Stale android/ios folders
**Solution**: Remove and regenerate
```bash
rm -rf android ios
npm run prebuild:android
```

## What the Plugin Does

The Reanimated config plugin automatically modifies your Android build files during `expo prebuild`:

**android/app/build.gradle**:
- Adds FBJNI dependency
- Configures packaging options

**android/build.gradle**:
- Sets reanimatedEnablePackagingOptions
- Updates SDK versions
- Sets Kotlin version

**android/gradle.properties**:
- Enables Reanimated packaging options
- Configures AndroidX and Jetifier

## Success Indicators

✅ Build completes without errors
✅ No Node execution errors
✅ App runs on Android device/emulator
✅ Reanimated animations work

## Need More Help?

See `REANIMATED_FIX_APPLIED.md` for detailed technical information.

## Quick Commands Reference

```bash
# Run automated fix
npm run fix:reanimated

# Alternative command
npm run fix:build

# Stop Gradle
npm run gradle:stop

# Clean Gradle
npm run gradle:clean

# Refresh Gradle (stop + clean)
npm run gradle:refresh

# Prebuild Android
npm run prebuild:android

# Build Android
npm run android
```
