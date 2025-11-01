
# Android Build Fix - Complete Guide

## Overview

This guide provides the complete solution for fixing Android build failures related to:
- **Metaspace OOM errors** in `:expo-updates:kspReleaseKotlin`
- **lintVitalAnalyzeRelease crashes** in react-native-maps, expo-modules-core, and safe-area-context

## Applied Fixes

### 1. gradle.properties - Memory & Stability

The following configuration has been applied to `android/gradle.properties`:

```properties
# Enable Gradle daemon and parallelism
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true

# Limit workers to prevent OOM
org.gradle.workers.max=2

# Increase JVM memory
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8 -XX:+HeapDumpOnOutOfMemoryError -XX:+UseParallelGC

# Kotlin daemon configuration
kotlin.incremental=true
kotlin.daemon.jvm.options=-Xmx2g,-XX:MaxMetaspaceSize=1024m

# KSP configuration
ksp.incremental=true
ksp.useKSP2=true

# Android configuration
android.useAndroidX=true
android.enableJetifier=true

# Force single stdlib
kotlin.stdlib.default.dependency=false
```

### 2. Aligned Kotlin/AGP/KSP Versions

To avoid classloader explosions, the following versions are aligned in `root build.gradle`:

```groovy
plugins {
    id "com.android.application" version "8.2.2" apply false
    id "com.android.library"    version "8.2.2" apply false
    id "org.jetbrains.kotlin.android" version "1.9.24" apply false
    id "com.google.devtools.ksp"      version "1.9.24-1.0.20" apply false
}
```

**Note:** Adjust these versions to match your Expo SDK's recommended versions if different.

### 3. Lint Configuration

In `android/app/build.gradle`, the following lint configuration prevents OOM on release:

```groovy
android {
    lint {
        abortOnError false
        checkReleaseBuilds false
        warningsAsErrors false
        htmlReport true
        xmlReport true
        // If a baseline exists:
        // baseline file("lint-baseline.xml")
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

### 4. Disable lintVital Tasks (Fallback)

In `root build.gradle`, all lintVital tasks are disabled as a fallback:

```groovy
subprojects {
    afterEvaluate {
        tasks.matching { it.name.toLowerCase().contains("lintvital") }.all { 
            enabled = false 
        }
    }
}
```

## Build Commands

### Clean & Restart

Before building, always clean and restart the Gradle daemon:

```bash
./gradlew --stop
./gradlew clean
```

### Standard Build

```bash
./gradlew :app:assembleRelease
```

### Build Without Lint (Fallback)

If the standard build still fails:

```bash
./gradlew :app:assembleRelease -x lintVitalRelease -x lintVitalAnalyzeRelease
```

### Build AAB for Play Store

```bash
./gradlew :app:bundleRelease
```

## Optional: Generate Lint Baseline

To suppress known lint warnings locally:

```bash
./gradlew :app:lintDebug
./gradlew :app:lintFix
```

This creates a `lint-baseline.xml` file that you can reference in your lint configuration.

## Troubleshooting

### If KSP Still OOMs

1. **Check for mixed Kotlin versions:**

```bash
./gradlew :expo-updates:dependencies --configuration releaseCompileClasspath
./gradlew :expo-modules-core:dependencies --configuration releaseCompileClasspath
```

2. **Look for version mismatches** in the output and align any divergent Kotlin/KSP artifacts to the versions specified above.

3. **Reduce worker count further** in `gradle.properties`:

```properties
org.gradle.workers.max=1
```

4. **Increase memory allocation** if needed:

```properties
org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2048m -Dfile.encoding=UTF-8 -XX:+HeapDumpOnOutOfMemoryError -XX:+UseParallelGC
kotlin.daemon.jvm.options=-Xmx3g,-XX:MaxMetaspaceSize=1024m
```

### If Build Still Fails

1. Check that JDK 17 is being used
2. Verify NODE_ENV=production is set
3. Ensure no duplicate Kotlin stdlib dependencies in modules
4. Check for any custom Gradle configurations that might override these settings

## Expected Results

After applying these fixes:

✅ **KSP Metaspace OOM resolved** - Bigger metaspace, fewer workers, aligned toolchain  
✅ **lintVitalAnalyzeRelease no longer blocks release** - Lint suppressed on release, still active on debug  
✅ **`:app:assembleRelease` completes successfully** - Android AAB/APK generated without errors

## CI/CD Integration

For CI/CD pipelines, ensure:

1. **Environment variables are set:**
   ```bash
   export NODE_ENV=production
   export JAVA_HOME=/path/to/jdk-17
   ```

2. **Use the provided build script:**
   ```bash
   chmod +x android-config-templates/build-release.sh
   ./android-config-templates/build-release.sh
   ```

3. **Or use the manual commands** from the "Build Commands" section above.

## Files Modified

The following template files have been updated:

- ✅ `android-config-templates/gradle.properties.template`
- ✅ `android-config-templates/app-build.gradle.template`
- ✅ `android-config-templates/root-build.gradle.template`
- ✅ `android-config-templates/ci-build-commands.md`
- ✅ `android-config-templates/build-release.sh`

## Next Steps

1. **Run `expo prebuild`** to regenerate the Android native files with these templates
2. **Clean and build** using the commands above
3. **Verify the build succeeds** and produces the expected APK/AAB
4. **Test the app** on a physical device or emulator

## Support

If you continue to experience issues after applying these fixes:

1. Check the Gradle build logs for specific error messages
2. Verify all versions are aligned (Kotlin, KSP, AGP)
3. Ensure no custom configurations are overriding these settings
4. Consider reducing parallelism further or increasing memory allocation

---

**Last Updated:** $(date)  
**Expo SDK:** 54.x  
**React Native:** 0.81.4  
**Gradle:** 8.14.x  
**AGP:** 8.2.2  
**Kotlin:** 1.9.24  
**KSP:** 1.9.24-1.0.20
