
# Expo React Native App - Fixes Applied

## Issues Fixed

### 1. Preview/Web Crash - `(0, react_1.use) is not a function`

**Problem**: expo-router was using React 19's `use()` API, but the project uses React 18.3.1

**Solution Applied**:
- Pinned `expo-router` to version `4.0.14` (specific version compatible with React 18)
- Updated all package resolution strategies (resolutions, overrides, pnpm.overrides) to enforce this version
- Added `ignoreMissing` rule for react-native in pnpm config to prevent peer dependency conflicts

### 2. Android Build Configuration

**Problem**: Multiple Gradle/Kotlin configuration issues

**Solutions Applied**:

#### A. New Architecture
- Already enabled in `app.config.js` with `newArchEnabled: true`
- Plugin `enableNewArchitecture.plugin.cjs` ensures it's set in all relevant places
- Set in `gradle.properties` as `newArchEnabled=true`

#### B. Kotlin Version Enforcement
- Set `kotlinVersion=2.0.21` in `gradle.properties`
- Added `kotlin.version=2.0.21` for additional compatibility
- Added `kotlin.stdlib.default.dependency=false` to prevent auto-upgrades
- Plugin `kotlinVersion.plugin.cjs` enforces this in build.gradle

#### C. KSP Version Matching
- Set `kspVersion=2.0.21-1.0.28` in `gradle.properties`
- Created new plugin `kspVersion.plugin.cjs` to enforce KSP version in:
  - project-level build.gradle
  - settings.gradle pluginManagement
- This prevents the "ksp-2.0.21-1.0.28 is too old for kotlin-2.1.20" error

#### D. NODE_ENV Configuration
- All npm scripts use `cross-env NODE_ENV=development` or `production`
- Updated `eas.json` to explicitly set `NODE_ENV` in all build profiles
- Added `EXPO_NO_DOTENV=1` to prevent .env file conflicts during builds

#### E. Gradle Configuration Cache
- Disabled configuration cache in `gradle.properties`:
  - `org.gradle.configuration-cache=false`
  - `org.gradle.unsafe.configuration-cache=false`
- This prevents "failed to configure project" errors

## Files Modified

1. **package.json**
   - Changed `expo-router` from `~4.0.0` to `4.0.14`
   - Updated all resolution strategies to enforce exact versions
   - Added `ignoreMissing` rule for react-native

2. **gradle.properties**
   - Added `kotlin.version=2.0.21`
   - Added `kspVersion=2.0.21-1.0.28`
   - Added `kotlin.stdlib.default.dependency=false`

3. **app.config.js**
   - Added `./plugins/kspVersion.plugin.cjs` to plugins array

4. **eas.json**
   - Added `NODE_ENV` to all build profiles
   - Added `EXPO_NO_DOTENV=1` to prevent env conflicts
   - Added `withoutCredentials: true` to development profile

5. **plugins/kspVersion.plugin.cjs** (NEW)
   - Enforces KSP version 2.0.21-1.0.28 in build.gradle
   - Enforces KSP version in settings.gradle pluginManagement

## Next Steps

### 1. Install Dependencies

Run the following command to install the updated dependencies:

```bash
pnpm install
```

Or if using npm:

```bash
npm install
```

### 2. Clean Cache and Restart

```bash
npx expo start -c
```

### 3. Test Preview/Web

Open the Expo Dev Tools and click "Run in web browser" or press `w` in the terminal.

**Expected Result**: No more `(0, react_1.use) is not a function` error

### 4. Test Android Development Build

If you have an `android` folder, clean it first:

```bash
rm -rf android
npx expo prebuild --platform android --clean
```

Then try building:

```bash
npx expo run:android
```

Or for EAS build:

```bash
eas build --platform android --profile development
```

**Expected Result**: 
- No Kotlin/KSP version mismatch errors
- No "failed to configure project" errors
- Build proceeds successfully

## Verification Checklist

- [ ] Preview/Web starts without `(0, react_1.use)` error
- [ ] Android prebuild completes without Kotlin/KSP errors
- [ ] Android build proceeds past "Configuring APK build process..."
- [ ] No NODE_ENV warnings during build
- [ ] New Architecture is enabled (check logs for confirmation)

## Troubleshooting

### If Preview/Web still crashes:

1. Delete node_modules and lockfile:
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

2. Clear Metro cache:
   ```bash
   npx expo start -c
   ```

### If Android build still fails:

1. Check Kotlin version in logs - should be 2.0.21
2. Check KSP version in logs - should be 2.0.21-1.0.28
3. Ensure NODE_ENV is set (check build logs)
4. Try disabling configuration cache if not already disabled

### If "failed to configure project" persists:

1. Ensure `org.gradle.configuration-cache=false` in gradle.properties
2. Delete android folder and run prebuild again
3. Check that all plugins are loading correctly (check expo config output)

## Additional Notes

- **React Version**: Staying on React 18.3.1 (not upgrading to React 19)
- **Expo SDK**: 54.0.29
- **React Native**: 0.76.6
- **New Architecture**: ENABLED (required for react-native-reanimated 4.1)
- **Kotlin**: 2.0.21 (locked, will not auto-upgrade)
- **KSP**: 2.0.21-1.0.28 (matches Kotlin version)

## Why These Fixes Work

1. **expo-router 4.0.14**: This specific version is compatible with React 18 and doesn't use the `use()` hook
2. **Kotlin 2.0.21**: Stable version with proper KSP support, prevents auto-upgrade to 2.1.20
3. **KSP 2.0.21-1.0.28**: Exact match for Kotlin 2.0.21, prevents version mismatch errors
4. **Configuration Cache Disabled**: Prevents Gradle from caching incompatible configurations
5. **NODE_ENV Explicit**: Ensures expo-constants and other packages have required environment variables

## Support

If issues persist after applying these fixes:

1. Check the Expo logs for specific error messages
2. Verify all files were updated correctly
3. Ensure you're using the correct Node version (18-22)
4. Try running `npx expo-doctor` to check for other issues
