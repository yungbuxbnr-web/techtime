
# React Native Reanimated Build Fix Guide

## Problem
The build fails with the error:
```
A problem occurred evaluating project ':react-native-reanimated'.
> Process 'command 'node'' finished with non-zero exit value 1
```

## Root Causes
1. **Babel Plugin Order**: The `react-native-reanimated/plugin` must be the **last** plugin in the Babel configuration
2. **Gradle Memory**: Insufficient memory allocation for Gradle can cause the build to fail
3. **Gradle Cache**: Stale Gradle cache can cause conflicts
4. **Node Version**: Ensure you're using Node.js 18-22 (as specified in package.json)

## Solution Steps

### Step 1: Clean Everything
```bash
# Stop all Gradle daemons
npm run gradle:stop

# Clean Gradle cache
npm run gradle:clean

# Remove node_modules and reinstall
rm -rf node_modules
npm install

# Remove android and ios folders (they will be regenerated)
rm -rf android ios
```

### Step 2: Verify Node Version
```bash
node --version
# Should be between 18.x and 22.x
```

If your Node version is outside this range, install a compatible version using nvm:
```bash
nvm install 18
nvm use 18
```

### Step 3: Prebuild Android
```bash
npm run prebuild:android
```

This will:
- Generate the android folder
- Apply all config plugins
- Configure Gradle wrapper to use version 8.14.3
- Set up proper memory allocation (6GB heap, 1.5GB metaspace)
- Enable AndroidX and Jetifier
- Configure Hermes and New Architecture

### Step 4: Build the App
```bash
npm run android
```

## What Was Fixed

### 1. Babel Configuration (`babel.config.cjs`)
- Ensured `react-native-reanimated/plugin` is the **last** plugin
- Added proper plugin ordering
- Maintained environment-specific configurations

### 2. Metro Configuration (`metro.config.js`)
- Added support for `.mjs` files
- Configured transformer options for Reanimated
- Enabled inline requires for better performance

### 3. Gradle Configuration
- **Increased memory allocation**: 6GB heap (was 4GB), 1.5GB metaspace (was 1GB)
- **Updated Gradle version**: 8.14.3 (better compatibility with RN 0.81.4)
- **Added G1GC**: Better garbage collection for large builds
- **Enabled AndroidX and Jetifier**: Required for modern React Native
- **Enabled Hermes and New Architecture**: As configured in app.config.js

### 4. Gradle Properties
The following properties are now set:
```properties
org.gradle.jvmargs=-Xmx6144m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8 -XX:+UseG1GC
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
org.gradle.caching=true
android.useAndroidX=true
android.enableJetifier=true
hermesEnabled=true
newArchEnabled=true
```

## Troubleshooting

### If the build still fails:

#### 1. Check Java Version
```bash
java -version
# Should be Java 17 or 21
```

#### 2. Increase Memory Further
Edit `android/gradle.properties` and increase the heap size:
```properties
org.gradle.jvmargs=-Xmx8192m -XX:MaxMetaspaceSize=2048m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8 -XX:+UseG1GC
```

#### 3. Disable Parallel Builds
If you're on a machine with limited resources:
```properties
org.gradle.parallel=false
```

#### 4. Check for Conflicting Dependencies
```bash
npm ls react-native-reanimated
# Should show only one version: ~4.1.0
```

#### 5. Clear All Caches
```bash
# Clear npm cache
npm cache clean --force

# Clear Gradle cache
rm -rf ~/.gradle/caches/

# Clear Metro cache
npx expo start -c
```

#### 6. Check Android SDK
Ensure you have the following installed via Android Studio SDK Manager:
- Android SDK Platform 34
- Android SDK Build-Tools 34.0.0
- Android SDK Platform-Tools
- Android SDK Tools
- Android Emulator

## Prevention

To prevent this issue in the future:

1. **Always keep Reanimated plugin last** in `babel.config.cjs`
2. **Don't modify Gradle files manually** - use the config plugins
3. **Run `npm run gradle:stop`** before building if you encounter issues
4. **Keep dependencies updated** but test thoroughly after updates
5. **Use the provided npm scripts** instead of running Gradle directly

## Additional Resources

- [React Native Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)
- [Gradle Performance Guide](https://docs.gradle.org/current/userguide/performance.html)

## Quick Reference Commands

```bash
# Clean and rebuild from scratch
npm run gradle:stop && npm run gradle:clean && rm -rf android ios node_modules && npm install && npm run prebuild:android && npm run android

# Just clean Gradle and rebuild
npm run gradle:stop && npm run gradle:clean && npm run prebuild:android && npm run android

# Check Gradle version
cd android && ./gradlew --version

# Run with more verbose output
cd android && ./gradlew assembleDebug --stacktrace --info
```
