
# Android Build Fix Guide - OutOfMemoryError: Metaspace

## Problem
The build fails with `java.lang.OutOfMemoryError: Metaspace` during the `:expo-updates:kspReleaseKotlin` task.

## Solution
Increase Gradle and Kotlin daemon memory allocation to handle Kotlin Symbol Processing (KSP) in Expo 54.

## Steps to Fix

### 1. Clean Your Project
```bash
# Navigate to your project root
cd /path/to/your/project

# Clean all build artifacts
rm -rf android/build
rm -rf android/app/build
rm -rf node_modules/.cache

# Optional: Clean Gradle cache (if issues persist)
cd android
./gradlew clean
cd ..
```

### 2. Update gradle.properties
Copy the updated `gradle.properties.template` to your Android project:

```bash
# If you haven't run prebuild yet, run it first:
npx expo prebuild --clean

# Then copy the template:
cp android-config-templates/gradle.properties.template android/gradle.properties
```

**Key Changes:**
- Increased heap memory: `3g` → `4g`
- Increased Metaspace: `768m` → `2g`
- Updated Kotlin daemon memory to match

### 3. Verify Your System Has Enough RAM
The build now requires at least **6GB of available RAM**:
- 4GB for Gradle JVM
- 2GB for system and other processes

If you're building on a machine with limited RAM:
- Close other applications
- Consider building on a more powerful machine or CI/CD service
- Reduce worker processes further: `org.gradle.workers.max=1`

### 4. Rebuild the Project

#### Option A: Using Expo CLI (Recommended)
```bash
# For development build
npx expo run:android

# For release build
npm run build:android
```

#### Option B: Using Gradle Directly
```bash
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
```

### 5. Monitor Build Progress
Watch for these tasks to complete successfully:
- `:expo-updates:kspReleaseKotlin` ✓
- `:expo-modules-core:lintVitalAnalyzeRelease` ✓
- `:react-native-reanimated:buildCMakeRelWithDebInfo[arm64-v8a]` ✓

## Troubleshooting

### If Build Still Fails with OOM

#### Reduce Parallel Execution
Edit `android/gradle.properties`:
```properties
org.gradle.parallel=false
org.gradle.workers.max=1
```

#### Build for Single Architecture
Edit `android/gradle.properties`:
```properties
# Build only for arm64-v8a (most modern devices)
reactNativeArchitectures=arm64-v8a
```

Then in `android/app/build.gradle`, update:
```gradle
ndk {
    abiFilters "arm64-v8a"
}
```

#### Disable New Architecture Temporarily
Edit `android/gradle.properties`:
```properties
newArchEnabled=false
```

### If Lint Tasks Fail
The templates already disable lint vital checks, but if you still see issues:

Edit `android/app/build.gradle`:
```gradle
android {
    lint {
        abortOnError false
        checkReleaseBuilds false
        warningsAsErrors false
    }
}
```

### Check Java Version
Ensure you're using Java 17:
```bash
java -version
# Should show: openjdk version "17.x.x"
```

If not, install Java 17:
- **macOS**: `brew install openjdk@17`
- **Linux**: `sudo apt install openjdk-17-jdk`
- **Windows**: Download from [Adoptium](https://adoptium.net/)

## Memory Configuration Summary

| Setting | Old Value | New Value | Purpose |
|---------|-----------|-----------|---------|
| Gradle Heap | 3g | 4g | Main build process memory |
| Metaspace | 768m | 2g | Kotlin metadata storage |
| Kotlin Daemon | 2g | 4g | Kotlin compilation memory |
| Worker Processes | 2 | 2 | Parallel task execution |

## Expected Build Time
With these settings, a clean release build should take:
- **First build**: 10-20 minutes
- **Incremental builds**: 2-5 minutes

## Success Indicators
You'll know the fix worked when you see:
```
> Task :expo-updates:kspReleaseKotlin
> Task :expo-modules-core:lintVitalAnalyzeRelease
BUILD SUCCESSFUL in 15m 32s
```

## Additional Resources
- [Gradle Performance Guide](https://docs.gradle.org/current/userguide/performance.html)
- [Kotlin Compiler Options](https://kotlinlang.org/docs/gradle-compiler-options.html)
- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)

## Notes
- These settings are already in the template files
- After running `expo prebuild`, the templates will be applied automatically
- If you manually edit `android/gradle.properties`, your changes will be preserved
- The warnings about deprecated Expo Manifests APIs are harmless and can be ignored
