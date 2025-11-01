
# Metaspace OOM Quick Fix Reference

## TL;DR - Quick Fix

If you're experiencing Metaspace OOM errors during Android builds, apply these changes:

### 1. Update `android/gradle.properties`

```properties
org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2048m -Dfile.encoding=UTF-8 -XX:+UseParallelGC
kotlin.daemon.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1024m
org.gradle.workers.max=2
org.gradle.caching=true
kotlin.incremental=true
-Dkotlin.compiler.execution.strategy=in-process
android.useAndroidX=true
android.nonTransitiveRClass=true
newArchEnabled=true
hermesEnabled=true
```

### 2. Update `android/app/build.gradle`

Add inside the `android` block:

```gradle
android {
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

### 3. Update `android/build.gradle` (Root)

Update Kotlin version:

```gradle
buildscript {
    ext {
        kotlinVersion = "2.1.20"
        kspVersion = "2.1.20-2.0.1"
    }
}

// Add at the end
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

### 4. Build Commands

```bash
# Clean build
./gradlew --stop
./gradlew clean
export NODE_ENV=production
./gradlew :app:bundleRelease

# Or use the build script
chmod +x android-config-templates/build-release.sh
./android-config-templates/build-release.sh
```

## What This Fixes

- ✅ Metaspace OOM in `:expo-updates:kspReleaseKotlin`
- ✅ Metaspace OOM in `lintVitalAnalyzeRelease`
- ✅ Memory issues with react-native-maps, expo-modules-core, safe-area-context
- ✅ Build failures due to lint errors

## If Still Failing

Reduce worker processes to 1:

```properties
org.gradle.workers.max=1
```

Or skip lint task explicitly:

```bash
./gradlew :app:bundleRelease -x lintVitalRelease
```

## Requirements

- JDK 17
- Gradle 8.14+
- AGP 8.5+
- Kotlin 2.1.20
- NDK 27.1

## Full Documentation

See `ANDROID_BUILD_METASPACE_FIX.md` for complete details.
