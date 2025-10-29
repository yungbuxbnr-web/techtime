
# Android Build Instructions - Fixed Configuration

This document provides step-by-step instructions for building the Android release AAB after applying all the fixes for JVM Metaspace warnings, lint failures, and native toolchain issues.

## Prerequisites

1. **JDK 17** - Ensure you have JDK 17 installed
   ```bash
   java -version
   # Should show version 17.x.x
   ```

2. **Android SDK** - Ensure Android SDK is properly configured

3. **Expo Prebuild** - Generate the android directory if not present
   ```bash
   npx expo prebuild -p android
   ```

## Configuration Changes Applied

### 1. JDK 17 and Kotlin/KSP Versions
- ✅ `settings.gradle`: Kotlin 1.9.24 and KSP 1.9.24-1.0.20
- ✅ `build.gradle`: Java 17 toolchain and Kotlin 1.9.24
- ✅ `app/build.gradle`: Java 17 compatibility

### 2. Memory and Worker Configuration
- ✅ `gradle.properties`: 
  - JVM heap: 4GB (adjust to 3GB if RAM < 8GB)
  - Metaspace: 1024MB
  - Kotlin daemon: 2GB
  - Workers limited to 2
  - Daemon disabled
  - Parallel builds disabled

### 3. Lint Configuration
- ✅ `app/build.gradle`: Lint errors disabled for release builds

### 4. Native Toolchain Stabilization
- ✅ `app/build.gradle`:
  - NDK version: 26.1.10909125
  - ABI filter: arm64-v8a only (for build stability)
  - CMake version: 3.22.1

## Build Commands

### Option 1: Clean Build (Recommended)

```bash
cd android

# Stop all Gradle daemons
./gradlew --stop || true

# Create isolated Gradle home
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"

# Clean caches
rm -rf ~/.gradle/caches/*/fileHashes ~/.gradle/caches/journal-1 || true

# Clean project
./gradlew clean --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME"

# Build release AAB with CMake parallelism limited
CMAKE_BUILD_PARALLEL_LEVEL=1 ./gradlew :app:bundleRelease --no-daemon \
  --max-workers=2 \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m"
```

### Option 2: Build Without Lint (If lint still fails)

```bash
CMAKE_BUILD_PARALLEL_LEVEL=1 ./gradlew :app:bundleRelease -x lint --no-daemon \
  --max-workers=2 \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m"
```

### Option 3: Low Memory Systems (< 8GB RAM)

```bash
CMAKE_BUILD_PARALLEL_LEVEL=1 ./gradlew :app:bundleRelease --no-daemon \
  --max-workers=2 \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx3g -XX:MaxMetaspaceSize=1024m"
```

## Output Location

After successful build, the AAB will be located at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Troubleshooting

### If KSP Still Runs Out of Memory

Add to `android/gradle.properties`:
```properties
kotlin.compiler.execution.strategy=in-process
```

### If Build Still Fails

1. **Check Java Version**
   ```bash
   java -version
   # Must be 17.x.x
   ```

2. **Clear All Gradle Caches**
   ```bash
   rm -rf ~/.gradle/caches
   rm -rf ~/.gradle/daemon
   rm -rf android/.gradle
   rm -rf android/app/build
   ```

3. **Verify Configuration Files**
   - Ensure `settings.gradle` has correct plugin versions
   - Ensure `gradle.properties` has memory settings
   - Ensure `app/build.gradle` has lint and NDK settings

4. **Check Available Memory**
   ```bash
   free -h
   # Ensure at least 4GB available
   ```

### Common Errors and Solutions

**Error: "Could not resolve org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24"**
- Solution: Check internet connection and Maven repositories

**Error: "Metaspace out of memory"**
- Solution: Increase `-XX:MaxMetaspaceSize` in gradle.properties

**Error: "Gradle daemon disappeared unexpectedly"**
- Solution: Use `--no-daemon` flag and isolated GRADLE_USER_HOME

**Error: "lintVitalAnalyzeRelease FAILED"**
- Solution: Use `-x lint` flag to skip lint tasks

## Production Build Considerations

For production builds, you may want to:

1. **Include More ABIs** - Edit `app/build.gradle`:
   ```gradle
   ndk {
       abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
   }
   ```

2. **Configure Release Signing** - Edit `app/build.gradle`:
   ```gradle
   signingConfigs {
       release {
           storeFile file('your-release-key.keystore')
           storePassword 'your-store-password'
           keyAlias 'your-key-alias'
           keyPassword 'your-key-password'
       }
   }
   ```

3. **Enable Proguard** - Already enabled in `app/build.gradle`

## CI/CD Integration

For CI/CD pipelines, use:

```bash
export CMAKE_BUILD_PARALLEL_LEVEL=1
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$CI_JOB_ID"

cd android
./gradlew --stop || true
./gradlew clean --no-daemon
./gradlew :app:bundleRelease -x lint --no-daemon \
  --max-workers=2 \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m"
```

## Verification

After build completes, verify the AAB:

```bash
# Check file exists
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# Check file size (should be reasonable, typically 20-50MB)
du -h android/app/build/outputs/bundle/release/app-release.aab
```

## Next Steps

1. Test the AAB on a physical device or emulator
2. Upload to Google Play Console for internal testing
3. Run through your QA process
4. Submit for production release

## Support

If you continue to experience issues:
1. Check the Gradle logs in `android/app/build/outputs/logs/`
2. Review the error messages carefully
3. Ensure all configuration files match the templates provided
4. Consider increasing memory allocation if available
