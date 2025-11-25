
# Memory Fix Summary - OutOfMemoryError: Metaspace

## What Was Changed

### gradle.properties.template
**Memory Allocations Increased:**

| Setting | Before | After | Change |
|---------|--------|-------|--------|
| `org.gradle.jvmargs` Heap | 3g | **4g** | +1GB |
| `org.gradle.jvmargs` Metaspace | 768m | **2g** | +1.25GB |
| `kotlin.daemon.jvm.options` | 2g | **4g** | +2GB |

**Why These Changes:**
- **Heap Memory (4g)**: Gradle needs more memory to process all the Expo modules and dependencies
- **Metaspace (2g)**: Kotlin Symbol Processing (KSP) stores class metadata here. Expo 54 with KSP requires significantly more metaspace
- **Kotlin Daemon (4g)**: Matches Gradle heap to prevent bottlenecks during Kotlin compilation

## How to Apply the Fix

### Quick Method (Recommended)
```bash
# 1. Clean everything
rm -rf android/build android/app/build node_modules/.cache

# 2. Run prebuild (this applies the templates automatically)
npx expo prebuild --clean --platform android

# 3. Manually copy the updated template to ensure it's applied
cp android-config-templates/gradle.properties.template android/gradle.properties

# 4. Build
npm run build:android
```

### Manual Method
If you prefer to edit directly:

1. Open `android/gradle.properties`
2. Find the line starting with `org.gradle.jvmargs=`
3. Replace it with:
   ```properties
   org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=2g -Dfile.encoding=UTF-8 -XX:+HeapDumpOnOutOfMemoryError -XX:+UseParallelGC
   ```
4. Find the line starting with `kotlin.daemon.jvm.options=`
5. Replace it with:
   ```properties
   kotlin.daemon.jvm.options=-Xmx4g -XX:MaxMetaspaceSize=2g
   ```
6. Save and rebuild

## System Requirements

**Minimum RAM:** 6GB available
- 4GB for Gradle/Kotlin
- 2GB for system and other processes

**Recommended RAM:** 8GB or more

**If you have limited RAM:**
- Close all other applications during build
- Consider using a cloud build service (EAS Build, GitHub Actions, etc.)
- Reduce workers: `org.gradle.workers.max=1`

## What to Expect

### Build Times
- **First clean build:** 10-20 minutes
- **Incremental builds:** 2-5 minutes

### Success Indicators
When the build succeeds, you'll see:
```
> Task :expo-updates:kspReleaseKotlin
> Task :expo-modules-core:lintVitalAnalyzeRelease
BUILD SUCCESSFUL in 15m 32s
```

### Warnings You Can Ignore
These warnings are harmless and expected:
```
w: file:///.../expo-manifests/.../EmbeddedManifest.kt:19:16 
   This declaration overrides a deprecated member...
```

These are deprecation warnings in Expo's own code and don't affect your build.

## Troubleshooting

### Still Getting OOM?

**Option 1: Reduce Parallelism**
```properties
# In android/gradle.properties
org.gradle.parallel=false
org.gradle.workers.max=1
```

**Option 2: Build Single Architecture**
```properties
# In android/gradle.properties
reactNativeArchitectures=arm64-v8a
```

**Option 3: Disable New Architecture Temporarily**
```properties
# In android/gradle.properties
newArchEnabled=false
```

### Build Hangs or Freezes?
- Check available RAM: `free -h` (Linux) or Activity Monitor (Mac)
- Kill existing Gradle daemons: `cd android && ./gradlew --stop`
- Restart your computer to free up memory

### Gradle Daemon Issues?
```bash
# Stop all Gradle daemons
cd android
./gradlew --stop

# Clear Gradle cache (nuclear option)
rm -rf ~/.gradle/caches
rm -rf ~/.gradle/daemon
```

## Why This Happened

The `OutOfMemoryError: Metaspace` occurs because:

1. **Expo 54** includes many native modules that use Kotlin
2. **KSP (Kotlin Symbol Processing)** generates code at compile time
3. **Metaspace** stores class metadata for all these generated classes
4. The default 768MB metaspace was too small for the amount of code generation

This is a common issue with modern React Native/Expo apps that use:
- Expo Updates
- Expo Modules Core
- React Native Reanimated
- React Native Gesture Handler
- Many other native modules

## Additional Notes

- These settings are safe and recommended for all Expo 54+ projects
- The memory is only used during build time, not at runtime
- Your app's final APK size is not affected
- These settings are already in your templates and will be applied on next prebuild

## Need More Help?

If you continue to have issues:
1. Check the full error log in the terminal
2. Verify Java 17 is installed: `java -version`
3. Ensure you have enough disk space (at least 10GB free)
4. Try building on a different machine with more RAM
5. Consider using EAS Build for cloud-based builds

## References
- [Gradle Performance](https://docs.gradle.org/current/userguide/performance.html)
- [Kotlin Compiler Options](https://kotlinlang.org/docs/gradle-compiler-options.html)
- [Java Memory Management](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/)
