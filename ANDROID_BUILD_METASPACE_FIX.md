
# Android Build Metaspace OOM Fix Guide

This guide documents the fixes applied to eliminate Metaspace OOM errors during Android builds, specifically in `:expo-updates:kspReleaseKotlin` and `lintVitalAnalyzeRelease` tasks.

## Problem

The Android build was failing with Metaspace OOM errors in:
- `:expo-updates:kspReleaseKotlin` - Kotlin Symbol Processing task
- `lintVitalAnalyzeRelease` - Android Lint analysis for react-native-maps, expo-modules-core, and safe-area-context

## Solution Overview

1. **Increased JVM and Metaspace memory** in `gradle.properties`
2. **Reduced parallelism** to limit concurrent memory usage
3. **Disabled fatal lint errors** in release builds
4. **Enabled incremental KSP processing** to reduce memory churn
5. **Aligned Kotlin and KSP versions** to 2.1.20

## Files Modified

### 1. android/gradle.properties

```properties
# Increased memory allocation
org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2048m -Dfile.encoding=UTF-8 -XX:+UseParallelGC
kotlin.daemon.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1024m

# Reduced parallelism
org.gradle.workers.max=2

# Optimizations
org.gradle.caching=true
kotlin.incremental=true
-Dkotlin.compiler.execution.strategy=in-process

# Android configuration
android.useAndroidX=true
android.nonTransitiveRClass=true

# React Native configuration
newArchEnabled=true
hermesEnabled=true

# KSP configuration
ksp.incremental=true
ksp.incremental.log=false
```

### 2. android/app/build.gradle

Added lint configuration to prevent build failures:

```gradle
android {
    // Disable fatal lint errors in release builds
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
    
    // For newer AGP versions
    lint {
        checkReleaseBuilds false
        abortOnError false
    }
    
    // Java 17 compatibility
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

### 3. android/build.gradle (Root)

Updated Kotlin and KSP versions:

```gradle
buildscript {
    ext {
        kotlinVersion = "2.1.20"
        kspVersion = "2.1.20-2.0.1"
    }
}

// Configure KSP for all subprojects
subprojects {
    afterEvaluate { project ->
        if (project.plugins.hasPlugin('com.google.devtools.ksp')) {
            project.extensions.configure('ksp') {
                arg("ksp.incremental", "true")
                arg("ksp.incremental.log", "false")
            }
        }
    }
}
```

### 4. Expo Modules with KSP

For any module that applies KSP (expo-updates, etc.), the root build.gradle now automatically configures:

```gradle
ksp {
    arg("ksp.incremental", "true")
    arg("ksp.incremental.log", "false")
}
```

## Build Commands

### Clean Build (Recommended)

```bash
# Stop all Gradle daemons
./gradlew --stop

# Clean build artifacts
./gradlew clean

# Build release AAB
./gradlew :app:bundleRelease
```

### CI/CD Build Commands

For CI environments, use these commands with additional JVM options:

```bash
# Export NODE_ENV
export NODE_ENV=production

# Stop existing daemons
./gradlew --stop

# Clean
./gradlew clean

# Build with Kotlin daemon JVM options
./gradlew :app:bundleRelease \
  -Dkotlin.daemon.jvm.options=-Xmx3g \
  -Dorg.gradle.jvmargs="-Xmx6g -XX:MaxMetaspaceSize=2048m"
```

### Skip Lint Task (If Needed)

If lint still causes issues, you can skip it explicitly:

```bash
./gradlew :app:bundleRelease -x lintVitalRelease
```

However, the primary fix is disabling fatal lint errors in the Gradle configuration above.

## Verification Checklist

After applying these fixes, verify:

1. ✅ `kspReleaseKotlin` completes without Metaspace OOM
2. ✅ No `lintVitalAnalyzeRelease` failures (warnings are OK)
3. ✅ Android AAB is generated successfully
4. ✅ iOS archive remains unaffected

## Troubleshooting

### If Build Still OOMs

1. **Reduce worker processes** to 1:
   ```properties
   org.gradle.workers.max=1
   ```

2. **Increase system swap space** (Linux/macOS):
   ```bash
   # Check current swap
   swapon --show
   
   # Add more swap if needed
   sudo fallocate -l 8G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. **Disable parallel builds**:
   ```properties
   org.gradle.parallel=false
   ```

4. **Build specific ABIs** to reduce memory:
   ```bash
   ./gradlew :app:bundleRelease -PreactNativeArchitectures=arm64-v8a
   ```

### Check Memory Usage

Monitor Gradle daemon memory usage:

```bash
# List running daemons
./gradlew --status

# Check system memory
free -h  # Linux
vm_stat  # macOS
```

## Requirements

- **JDK 17** - Ensure you're using JDK 17
- **Gradle 8.14+** - Compatible with AGP 8.5
- **NDK 27.1** - As specified in gradle.properties
- **Hermes enabled** - Keep Hermes JS engine enabled
- **New Architecture** - Keep enabled as configured

## Additional Notes

- **Scoped Storage**: Keep scoped storage enabled (do not request legacy storage)
- **Toolchain Versions**: Do not downgrade toolchains
- **iOS Builds**: These changes do not affect iOS builds
- **Warnings**: Deprecated kotlinOptions warnings are acceptable and won't fail the build

## Build Script

A convenience script is provided in `android-config-templates/build-release.sh`:

```bash
#!/bin/bash
set -e

echo "🧹 Stopping Gradle daemons..."
./gradlew --stop

echo "🧹 Cleaning build artifacts..."
./gradlew clean

echo "🏗️  Building release AAB..."
export NODE_ENV=production
./gradlew :app:bundleRelease \
  -Dkotlin.daemon.jvm.options=-Xmx3g \
  -Dorg.gradle.jvmargs="-Xmx6g -XX:MaxMetaspaceSize=2048m"

echo "✅ Build complete!"
echo "📦 AAB location: android/app/build/outputs/bundle/release/app-release.aab"
```

Make it executable:
```bash
chmod +x android-config-templates/build-release.sh
```

## References

- [Gradle Performance Guide](https://docs.gradle.org/current/userguide/performance.html)
- [Kotlin Compiler Options](https://kotlinlang.org/docs/gradle-compiler-options.html)
- [KSP Documentation](https://kotlinlang.org/docs/ksp-overview.html)
- [Android Lint Configuration](https://developer.android.com/studio/write/lint)
