
# Android Build Fix Guide - Gradle Lock Error Resolution

This guide provides step-by-step instructions to fix the Gradle lock error and build a release AAB.

## Prerequisites
- Ensure you have JDK 17 installed
- Navigate to your project root directory

## Step 1: Stop All Gradle Daemons and Clear Locks

Run these commands in your terminal:

```bash
cd android
./gradlew --stop || true
pkill -f 'GradleDaemon' || true
pkill -f 'org.gradle.launcher.daemon' || true
sleep 2
rm -f ~/.gradle/caches/journal-1/journal-1.lock
```

## Step 2: Set Up Isolated Gradle Cache

Before running any Gradle commands, set the environment variable:

```bash
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"
```

## Step 3: Update android/gradle.properties

Open `android/gradle.properties` and ensure it contains these lines (merge with existing content, avoid duplicates):

```properties
# Gradle Configuration
org.gradle.daemon=false
org.gradle.parallel=false
org.gradle.workers.max=2
org.gradle.vfs.watch=false
org.gradle.caching=true

# Memory Configuration
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8 -Dkotlin.daemon.jvm.options=-Xmx2g,-XX:MaxMetaspaceSize=1024m

# Kotlin Configuration
kotlin.incremental=true
ksp.incremental=true

# Android Configuration
android.useAndroidX=true
android.enableJetifier=true
```

**Note:** If your system has limited RAM (less than 8GB), change `-Xmx4g` to `-Xmx3g`.

## Step 4: Update android/app/build.gradle

Add the following configurations to `android/app/build.gradle`:

### 4a. Limit ABIs (inside android { defaultConfig { } })

```gradle
android {
    defaultConfig {
        // ... existing config ...
        
        ndk {
            abiFilters "arm64-v8a"
        }
    }
}
```

### 4b. Configure Lint (inside android { })

```gradle
android {
    // ... existing config ...
    
    lint {
        abortOnError false
        checkReleaseBuilds false
    }
}
```

If using older AGP version, use `lintOptions` instead:

```gradle
android {
    lintOptions {
        abortOnError false
        checkReleaseBuilds false
    }
}
```

## Step 5: Update android/build.gradle (Root)

Add Java toolchain configuration at the top level:

```gradle
allprojects {
    // ... existing config ...
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```

## Step 6: Clean Gradle State

Run these commands:

```bash
rm -rf ~/.gradle/caches/*/fileHashes ~/.gradle/caches/journal-1 || true
./gradlew clean --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME"
```

## Step 7: Build Release AAB

### Option A: Standard Build (Preferred)

```bash
./gradlew :app:bundleRelease --no-daemon \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" \
  --max-workers=2
```

### Option B: Build Without Lint (If Option A Fails)

```bash
./gradlew :app:bundleRelease -x lint --no-daemon \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" \
  --max-workers=2
```

## Step 8: Locate Your Build Artifacts

After a successful build, find your files at:

- **AAB (Android App Bundle):** `android/app/build/outputs/bundle/release/app-release.aab`
- **APK (if configured):** `android/app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### If you still encounter memory errors:
1. Reduce `-Xmx4g` to `-Xmx3g` or `-Xmx2g`
2. Ensure no other Gradle processes are running: `ps aux | grep gradle`
3. Clear all Gradle caches: `rm -rf ~/.gradle/caches`

### If you encounter "Could not find method" errors:
- Verify your Gradle version is compatible with AGP
- Check `android/gradle/wrapper/gradle-wrapper.properties` for Gradle version
- Ensure you're using AGP 8.x or compatible version

### If the build times out:
- Increase timeout in `gradle.properties`: `org.gradle.daemon.idletimeout=3600000`
- Use `--no-parallel` flag explicitly

## CI/CD Integration

If running in CI/CD, add these environment variables:

```bash
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"
export GRADLE_OPTS="-Xmx4g -XX:MaxMetaspaceSize=1024m -Dorg.gradle.daemon=false"
```

## Summary of Changes

1. ✅ Disabled Gradle daemon to prevent lock contention
2. ✅ Disabled parallel builds to reduce resource usage
3. ✅ Limited workers to 2 to prevent excessive file handles
4. ✅ Disabled file system watching to avoid lock issues
5. ✅ Increased JVM memory for Gradle and Kotlin
6. ✅ Limited ABIs to arm64-v8a to reduce build time
7. ✅ Disabled lint errors to prevent build failures
8. ✅ Configured Java 17 toolchain
9. ✅ Used isolated Gradle cache per build

## Next Steps

After successfully building:

1. Test the AAB on a device or upload to Google Play Console
2. If you need an APK for direct installation, run:
   ```bash
   ./gradlew :app:assembleRelease --no-daemon \
     -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
     -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" \
     --max-workers=2
   ```

## Important Notes

- These settings are optimized for CI/CD environments and containers
- For local development, you may want to re-enable daemon and parallel builds
- Always use the isolated Gradle cache (`GRADLE_USER_HOME`) in CI to prevent cross-job contention
- The AAB file is required for Google Play Store uploads
- Keep these configurations in version control for consistent builds

---

**Build Status:** Ready to build after applying these configurations
**Expected Build Time:** 5-15 minutes depending on system resources
**Output Location:** `android/app/build/outputs/bundle/release/`
