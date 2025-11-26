
# Android Build Configuration Fix

## Issues Fixed

This document describes the fixes applied to resolve the Android build failures related to:

1. ❌ **Missing `@expo/config-plugins` dependency**
2. ❌ **NODE_ENV environment variable not set**
3. ❌ **Node.js version incompatibility (v22.21.0)**
4. ❌ **Duplicate "scheme" key in app.json**

---

## 1. Fixed Missing @expo/config-plugins

### Problem
```
Error: Cannot find module '@expo/config-plugins'
Require stack:
- /expo-project/plugins/gradleWrapperConfig.plugin.cjs
```

The `gradleWrapperConfig.plugin.cjs` file requires `@expo/config-plugins`, but it wasn't listed as a dependency in `package.json`. With pnpm, all required packages must be direct dependencies.

### Solution
✅ Added `@expo/config-plugins` to `package.json` dependencies:

```json
"dependencies": {
  "@expo/config-plugins": "54.0.2",
  ...
}
```

The plugin already has proper error handling and uses the correct CommonJS import:
```javascript
const { withGradleProperties } = require('@expo/config-plugins');
```

---

## 2. Fixed NODE_ENV Environment Variable

### Problem
```
The NODE_ENV environment variable is required but was not specified.
```

The Expo config generation process requires `NODE_ENV` to be set, but it wasn't always available during the `:expo-constants:createExpoConfig` Gradle task.

### Solution
✅ Updated `eas.json` to explicitly set `NODE_ENV` for all build profiles:

- **Development builds**: `NODE_ENV=development`
- **Preview builds**: `NODE_ENV=production`
- **Production builds**: `NODE_ENV=production`

✅ Updated `app.config.js` to safely handle missing `NODE_ENV`:

```javascript
// Safely get NODE_ENV with fallback - NEVER throw if missing
const NODE_ENV = process.env.NODE_ENV || 'production';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';
```

All environment variable references in `app.config.js` now have safe fallbacks and will never throw errors.

---

## 3. Fixed Node.js Version Compatibility

### Problem
```
Node.js v22.21.0
```

The build was using Node.js v22.21.0, which is not officially supported by Expo SDK 54. Expo SDK 54 supports Node 18 LTS and Node 20 LTS.

### Solution
✅ Pinned Node version to **18.20.5** (LTS) in `eas.json` for all build profiles:

```json
{
  "build": {
    "development": {
      "node": "18.20.5",
      ...
    },
    "preview": {
      "node": "18.20.5",
      ...
    },
    "production": {
      "node": "18.20.5",
      ...
    }
  }
}
```

This ensures all EAS builds use a stable, Expo-supported Node version.

---

## 4. Fixed Duplicate "scheme" Key

### Problem
```
Root-level "expo" object found. Ignoring extra key in Expo config: "scheme".
```

The `app.json` file had `"scheme"` defined both inside the `expo` object (correct) and at the root level (incorrect), causing a warning.

### Solution
✅ Removed the duplicate root-level `"scheme"` key from `app.json`:

**Before:**
```json
{
  "expo": {
    "scheme": "techtime",
    ...
  },
  "scheme": "TechTime"  // ❌ Duplicate - removed
}
```

**After:**
```json
{
  "expo": {
    "scheme": "techtime",
    ...
  }
}
```

---

## Build Configuration Summary

### Gradle Configuration
The `gradleWrapperConfig.plugin.cjs` plugin automatically configures Gradle for CI builds:

- ✅ Disables Gradle daemons (`org.gradle.daemon=false`)
- ✅ Disables parallel builds (`org.gradle.parallel=false`)
- ✅ Disables configure-on-demand (`org.gradle.configureondemand=false`)
- ✅ Increases memory allocation (`-Xmx4096m`)
- ✅ Sets network timeouts for reliability

### EAS Build Configuration
All build profiles in `eas.json` now include:

- ✅ Node 18.20.5 (LTS)
- ✅ NODE_ENV set appropriately
- ✅ `--no-daemon` flag in Gradle commands
- ✅ Increased Node memory (`NODE_OPTIONS=--max-old-space-size=4096`)
- ✅ Gradle opts to prevent cache locking

---

## Next Steps

### 1. Clean Build
Run a clean build to ensure no stale cache:

```bash
npm run gradle:clean
```

Or manually:
```bash
cd android && ./gradlew clean --no-daemon
```

### 2. Rebuild Android
Trigger a new Android build:

```bash
npm run build:eas:android
```

Or for preview:
```bash
npm run build:preview:android
```

### 3. Verify Success
The build should now complete without:
- ❌ `Cannot find module '@expo/config-plugins'` errors
- ❌ `NODE_ENV environment variable is required` errors
- ❌ Node version compatibility warnings
- ❌ Duplicate scheme warnings

---

## Troubleshooting

### If the build still fails:

1. **Check EAS build logs** for the exact error message
2. **Verify dependencies are installed**:
   ```bash
   npm install
   ```
3. **Clear Gradle caches** (if building locally):
   ```bash
   npm run gradle:refresh
   ```
4. **Ensure you're using the correct Node version locally**:
   ```bash
   node --version  # Should be 18.x or 20.x
   ```

### Common Issues

**Issue**: Plugin still can't find `@expo/config-plugins`
**Solution**: Run `npm install` or `pnpm install` to ensure the package is installed

**Issue**: NODE_ENV still not set
**Solution**: Check that you're using the correct EAS build profile (development, preview, or production)

**Issue**: Build uses wrong Node version
**Solution**: EAS will use the pinned version (18.20.5) automatically. For local builds, use nvm or similar to switch to Node 18.

---

## Files Modified

1. ✅ `package.json` - Added `@expo/config-plugins` dependency
2. ✅ `app.json` - Removed duplicate "scheme" key
3. ✅ `app.config.js` - Enhanced NODE_ENV handling with safe fallbacks
4. ✅ `eas.json` - Pinned Node 18.20.5 and ensured NODE_ENV is set
5. ✅ `plugins/gradleWrapperConfig.plugin.cjs` - Already had proper error handling

---

## Summary

All Android build configuration issues have been resolved:

- ✅ `@expo/config-plugins` is now a direct dependency
- ✅ NODE_ENV is set for all build types (development/production)
- ✅ Node 18 LTS is pinned for all EAS builds
- ✅ Duplicate "scheme" key removed from app.json
- ✅ All environment variables have safe fallbacks
- ✅ Gradle is configured to prevent cache locking in CI

The Android build should now complete successfully! 🎉
