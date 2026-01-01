
# Build Instructions for TechTime App

## Current Status
Your app is properly configured for Expo SDK 54 with React Native 0.76.6 and the New Architecture enabled.

## The Issue
The "Failed to update project configuration" error occurs because the Android native project hasn't been generated yet. Natively's APK builder requires the native Android project to exist before it can build.

## Solution: Generate the Android Project First

### Step 1: Run Prebuild
Before attempting to build an APK, you need to generate the native Android project:

```bash
npx expo prebuild --platform android --clean
```

This command will:
- Generate the `android/` folder with all native Android files
- Apply all your config plugins (Kotlin version, KSP version, New Architecture, etc.)
- Set up gradle.properties with the correct settings
- Configure build.gradle files properly

### Step 2: Verify the Android Folder
After running prebuild, check that these files exist:
- `android/gradle.properties` - Should contain `newArchEnabled=true`, `kotlinVersion=2.0.21`, `kspVersion=2.0.21-1.0.28`
- `android/build.gradle` - Project-level build configuration
- `android/app/build.gradle` - App-level build configuration
- `android/settings.gradle` - Gradle settings

### Step 3: Build the APK
Now you can build the APK using one of these methods:

#### Option A: Using Natively's APK Builder
Click the "Build APK" button in Natively. It should now work since the Android project exists.

#### Option B: Using EAS Build (Recommended for Production)
```bash
npm run build:preview:android
```

This will build a development APK using EAS Build.

For a production APK:
```bash
npm run build:eas:android
```

#### Option C: Local Build
```bash
npm run build:android
```

This builds locally using Gradle (requires Android SDK installed).

## Important Notes

### Configuration Cache is Disabled
The gradle.properties file has `org.gradle.configuration-cache=false` because the configuration cache causes build failures with Expo's config plugins. This is intentional and necessary.

### New Architecture is Enabled
Your app uses the New Architecture (`newArchEnabled=true`) which is required by react-native-reanimated 4.1. Do not disable this.

### Kotlin and KSP Versions
- Kotlin: 2.0.21
- KSP: 2.0.21-1.0.28

These versions are locked to prevent compatibility issues. The plugins ensure these versions are used consistently.

### Environment Variables
The following environment variables are set in eas.json:
- `NODE_ENV=production` (for production builds)
- `GRADLE_OPTS=-Dorg.gradle.configuration-cache=false` (disables config cache)

## Troubleshooting

### If prebuild fails:
1. Delete the `android/` folder if it exists
2. Clear npm/pnpm cache: `pnpm store prune` or `npm cache clean --force`
3. Reinstall dependencies: `pnpm install` or `npm install`
4. Try prebuild again

### If you see Kotlin/KSP version mismatch errors:
The plugins should handle this automatically, but if you still see errors:
1. Check `android/gradle.properties` - ensure `kotlinVersion=2.0.21` and `kspVersion=2.0.21-1.0.28`
2. Check `android/build.gradle` - ensure it uses `$kotlinVersion` variable
3. Run `npm run gradle:clean` to clean Gradle cache
4. Run prebuild again

### If you see "enableBundleCompression" error:
The `fixReactExtension.plugin.cjs` should remove this automatically. If you still see it:
1. Open `android/app/build.gradle`
2. Find the `react {}` block
3. Remove the line `enableBundleCompression = false`

## Summary
The key takeaway: **Always run `npx expo prebuild --platform android --clean` before attempting to build an APK**. This generates the native Android project that the build process requires.
