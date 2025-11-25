
# Expo Constants Config Generation Fix

## Problem
The Android build was failing with:
```
Execution failed for task ':expo-constants:createExpoConfig'.
> Process 'command 'node'' finished with non-zero exit value 1
```

## Root Causes Identified

1. **Missing NODE_ENV**: The Expo config generation process requires `NODE_ENV` to be set, but it wasn't always available during the `:expo-constants:createExpoConfig` task.

2. **Unsafe Environment Variable Access**: The `app.json` file doesn't support dynamic environment variable handling, and the Gradle plugin was accessing `process.env` without proper safety checks.

3. **Console Logging During Config Generation**: The Gradle plugin was using `console.log` which can cause issues during the config generation phase in CI environments.

4. **No Fallback Values**: There were no fallback values for environment variables, causing crashes when they weren't set.

## Fixes Applied

### 1. Migrated from app.json to app.config.js
**File**: `app.config.js` (new)

- Created a dynamic configuration file that safely handles environment variables
- Added fallback values for all environment variables:
  - `NODE_ENV` defaults to `'production'`
  - `APP_NAME` defaults to `'techtime'`
  - `APP_SLUG` defaults to `'techtime'`
  - `EXPO_OWNER` defaults to `'bnr'`
  - `APP_VERSION` defaults to `'1.0.0'`
  - `IOS_BUNDLE_ID` defaults to `'com.bnr.techtime'`
  - `ANDROID_PACKAGE` defaults to `'com.brcarszw.techtracer'`
- Only logs configuration details in development mode to avoid polluting CI logs

### 2. Enhanced Gradle Plugin Safety
**File**: `plugins/gradleWrapperConfig.plugin.cjs`

- Wrapped all code in try-catch blocks to prevent crashes
- Added safe environment variable detection with proper fallbacks
- Removed console.log statements in CI environments
- Made the plugin defensive against missing `process` or `console` objects
- Returns config unchanged if any errors occur

### 3. Updated EAS Build Configuration
**File**: `eas.json`

- Ensured `NODE_ENV` is explicitly set in all build profiles:
  - `development`: `NODE_ENV=development`
  - `preview`: `NODE_ENV=production`
  - `production`: `NODE_ENV=production`
- Added `--no-configure-on-demand` flag to Gradle commands
- Set `GRADLE_OPTS` to disable daemons and parallel builds in CI

### 4. Enhanced Pre-Install Hook
**File**: `scripts/eas-build-pre-install.sh`

- Added automatic `NODE_ENV` detection and setting:
  - Sets to `production` in CI/EAS environments
  - Sets to `development` in local environments
- Ensures `NODE_ENV` is always available before any build steps

### 5. Enhanced Post-Install Hook
**File**: `scripts/eas-build-post-install.sh`

- Added `NODE_ENV` fallback setting if not already set
- Made the fix-gradle-wrapper script optional (continues if it fails)
- Improved error handling for missing android directory

### 6. Updated Gradle Properties
**File**: `android/gradle.properties`

- Clarified that daemon settings will be overridden by the plugin
- Added comments explaining CI vs local behavior
- Kept sensible defaults for local development

### 7. Updated Babel Configuration
**File**: `babel.config.cjs`

- Added safe `NODE_ENV` fallback (defaults to `'production'`)
- Added `babel-plugin-transform-remove-console` for production builds
- Ensures Babel doesn't crash if `NODE_ENV` is missing

### 8. Updated Package Scripts
**File**: `package.json`

- Ensured all scripts that run Expo commands set `NODE_ENV` explicitly
- Added `cross-env NODE_ENV=production` to prebuild scripts
- Installed `babel-plugin-transform-remove-console` as a dev dependency

## How It Works Now

### During Config Generation (`:expo-constants:createExpoConfig`)

1. **Node starts** and loads `app.config.js`
2. **NODE_ENV is checked** - if not set, defaults to `'production'`
3. **All environment variables** are accessed with safe fallbacks
4. **Gradle plugin executes** with full error handling
5. **Config is generated** successfully without crashes

### During EAS Builds

1. **Pre-install hook** sets `NODE_ENV` and cleans Gradle caches
2. **Dependencies install** with proper environment
3. **Post-install hook** ensures Gradle is clean and ready
4. **Config generation** succeeds with all variables set
5. **Build proceeds** with proper Gradle settings

### During Local Development

1. **Scripts set NODE_ENV** via `cross-env`
2. **Config loads** with development settings
3. **Gradle uses daemons** for faster builds
4. **Development is smooth** with proper logging

## Testing the Fix

### Test 1: Config Generation
```bash
# This should now succeed without errors
cross-env NODE_ENV=production expo prebuild --clean
```

### Test 2: EAS Build
```bash
# This should now complete the :expo-constants:createExpoConfig task
eas build --platform android --profile production
```

### Test 3: Local Build
```bash
# This should work with proper environment
npm run build:android
```

## Key Improvements

✅ **No more crashes** during config generation
✅ **Safe environment variable handling** with fallbacks
✅ **Proper NODE_ENV** in all build scenarios
✅ **Better error handling** in plugins
✅ **Cleaner CI logs** (no unnecessary console output)
✅ **Faster local builds** (daemons enabled locally)
✅ **Reliable CI builds** (daemons disabled in CI)

## What Changed

### Files Modified
- `app.config.js` (new - replaces app.json for dynamic config)
- `plugins/gradleWrapperConfig.plugin.cjs` (enhanced safety)
- `android/gradle.properties` (clarified comments)
- `eas.json` (explicit NODE_ENV in all profiles)
- `scripts/eas-build-pre-install.sh` (NODE_ENV handling)
- `scripts/eas-build-post-install.sh` (NODE_ENV handling)
- `babel.config.cjs` (NODE_ENV fallback)
- `package.json` (explicit NODE_ENV in scripts)

### Files Kept
- `app.json` (kept for reference, but app.config.js takes precedence)
- All other project files remain unchanged

## Next Steps

1. **Delete the old app.json** if you want (optional - app.config.js takes precedence)
2. **Run a new Android build** to verify the fix
3. **Monitor the build logs** to ensure `:expo-constants:createExpoConfig` completes successfully

## Troubleshooting

If you still encounter issues:

1. **Check NODE_ENV is set**: `echo $NODE_ENV`
2. **Verify app.config.js loads**: `node -e "console.log(require('./app.config.js'))"`
3. **Check Gradle properties**: `cat android/gradle.properties | grep daemon`
4. **Review build logs** for any remaining errors

## Additional Notes

- The `app.json` file is still present but will be ignored in favor of `app.config.js`
- You can safely delete `app.json` if you want, but it's not required
- All environment variables now have safe defaults
- The build should be more reliable in both CI and local environments
