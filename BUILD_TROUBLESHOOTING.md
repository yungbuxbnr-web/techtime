
# Android Build Troubleshooting Guide

## Quick Diagnosis

### Error: `:expo-constants:createExpoConfig` fails

**Symptoms:**
```
Execution failed for task ':expo-constants:createExpoConfig'.
> Process 'command 'node'' finished with non-zero exit value 1
```

**Quick Fix:**
1. Ensure `NODE_ENV` is set:
   ```bash
   export NODE_ENV=production
   ```

2. Clean and rebuild:
   ```bash
   npm run gradle:clean
   npm run prebuild
   ```

3. Try the build again:
   ```bash
   eas build --platform android --profile production
   ```

## Common Issues and Solutions

### Issue 1: NODE_ENV Not Set

**Error:** Config generation fails with undefined variable errors

**Solution:**
- The app now automatically sets `NODE_ENV=production` if not set
- For local development, use: `cross-env NODE_ENV=development`
- For production builds, use: `cross-env NODE_ENV=production`

### Issue 2: Gradle Cache Lock

**Error:** `Timeout waiting to lock journal cache`

**Solution:**
```bash
# Kill Gradle daemons
npm run gradle:stop

# Clean Gradle cache
npm run gradle:clean

# Or use the combined command
npm run gradle:refresh
```

### Issue 3: Out of Memory Error

**Error:** `java.lang.OutOfMemoryError: Metaspace`

**Solution:**
- Already fixed in `android/gradle.properties`:
  ```properties
  org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
  ```
- If still occurring, increase memory in `eas.json`:
  ```json
  "NODE_OPTIONS": "--max-old-space-size=8192"
  ```

### Issue 4: Plugin Errors

**Error:** Plugin fails during config generation

**Solution:**
- The Gradle plugin now has full error handling
- Check `plugins/gradleWrapperConfig.plugin.cjs` for any custom modifications
- Verify the plugin exports a function:
  ```javascript
  module.exports = function withGradleWrapperConfig(config) {
    return config;
  };
  ```

## Build Commands Reference

### Local Development
```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Production Builds
```bash
# EAS Build (recommended)
npm run build:eas:android
npm run build:eas:ios
npm run build:eas:all

# Local production build
npm run build:android
npm run build:ios
```

### Prebuild (Generate Native Projects)
```bash
# Clean prebuild
npm run prebuild

# Platform-specific prebuild
npm run prebuild:android
npm run prebuild:ios
```

### Gradle Maintenance
```bash
# Stop all Gradle daemons
npm run gradle:stop

# Clean Gradle build
npm run gradle:clean

# Stop and clean (recommended)
npm run gradle:refresh

# Fix Gradle wrapper
npm run fix:gradle
```

## Environment Variables

### Required for Builds
- `NODE_ENV`: Set to `development` or `production`
- `NODE_OPTIONS`: Memory settings for Node.js

### Optional (Have Defaults)
- `APP_NAME`: App display name (default: `techtime`)
- `APP_SLUG`: Expo slug (default: `techtime`)
- `APP_VERSION`: App version (default: `1.0.0`)
- `EXPO_OWNER`: Expo account owner (default: `bnr`)
- `IOS_BUNDLE_ID`: iOS bundle identifier (default: `com.bnr.techtime`)
- `ANDROID_PACKAGE`: Android package name (default: `com.brcarszw.techtracer`)

### Automatically Set by EAS
- `CI`: Set to `true` in CI environments
- `EAS_BUILD`: Set to `true` during EAS builds
- `GRADLE_OPTS`: Gradle JVM options

## Verification Steps

### 1. Verify Config Loads
```bash
node -e "console.log(require('./app.config.js'))"
```

### 2. Verify Gradle Properties
```bash
cat android/gradle.properties | grep -E "(daemon|parallel|jvmargs)"
```

### 3. Verify NODE_ENV
```bash
echo $NODE_ENV
```

### 4. Test Config Generation
```bash
cross-env NODE_ENV=production expo config --type public
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Set up environment
  run: |
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=4096"

- name: Install dependencies
  run: npm ci

- name: Build Android
  run: npm run build:eas:android
```

### GitLab CI Example
```yaml
build:android:
  variables:
    NODE_ENV: "production"
    NODE_OPTIONS: "--max-old-space-size=4096"
  script:
    - npm ci
    - npm run build:eas:android
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs**: Look for the specific error message
2. **Verify environment**: Ensure all environment variables are set
3. **Clean everything**: Run `npm run gradle:refresh`
4. **Try prebuild**: Run `npm run prebuild` to regenerate native projects
5. **Check Node version**: Ensure you're using Node 18 or 20

## Files to Check

When debugging build issues, check these files:

1. `app.config.js` - Main configuration
2. `android/gradle.properties` - Gradle settings
3. `eas.json` - EAS build configuration
4. `plugins/gradleWrapperConfig.plugin.cjs` - Gradle plugin
5. `scripts/eas-build-pre-install.sh` - Pre-install hook
6. `scripts/eas-build-post-install.sh` - Post-install hook

## Success Indicators

Your build is working correctly when you see:

✅ `:expo-constants:createExpoConfig` completes without errors
✅ No "Process 'command 'node'' finished with non-zero exit value" errors
✅ Gradle builds complete successfully
✅ APK or AAB is generated

## Prevention

To avoid future issues:

1. **Always set NODE_ENV** in your build scripts
2. **Use cross-env** for cross-platform compatibility
3. **Keep Gradle clean** by running `gradle:clean` before major builds
4. **Monitor memory usage** and adjust if needed
5. **Keep dependencies updated** but test thoroughly
