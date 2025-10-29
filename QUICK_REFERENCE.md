
# Quick Reference - Android Build Fix

## One-Line Commands

### Stop Everything
```bash
cd android && ./gradlew --stop && pkill -f 'GradleDaemon' && pkill -f 'org.gradle.launcher.daemon' && sleep 2 && rm -f ~/.gradle/caches/journal-1/journal-1.lock
```

### Set Isolated Cache
```bash
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"
```

### Clean Build
```bash
rm -rf ~/.gradle/caches/*/fileHashes ~/.gradle/caches/journal-1 && ./gradlew clean --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME"
```

### Build AAB
```bash
./gradlew :app:bundleRelease --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME" -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" --max-workers=2
```

### Build AAB (No Lint)
```bash
./gradlew :app:bundleRelease -x lint --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME" -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" --max-workers=2
```

### Build APK
```bash
./gradlew :app:assembleRelease --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME" -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" --max-workers=2
```

## Configuration Snippets

### gradle.properties (Essential Lines)
```properties
org.gradle.daemon=false
org.gradle.parallel=false
org.gradle.workers.max=2
org.gradle.vfs.watch=false
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8 -Dkotlin.daemon.jvm.options=-Xmx2g,-XX:MaxMetaspaceSize=1024m
kotlin.incremental=true
ksp.incremental=true
```

### app/build.gradle (NDK)
```gradle
android {
    defaultConfig {
        ndk {
            abiFilters "arm64-v8a"
        }
    }
}
```

### app/build.gradle (Lint)
```gradle
android {
    lint {
        abortOnError false
        checkReleaseBuilds false
    }
}
```

### build.gradle (Java 17)
```gradle
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```

## File Locations

| File | Location |
|------|----------|
| AAB | `android/app/build/outputs/bundle/release/app-release.aab` |
| APK | `android/app/build/outputs/apk/release/app-release.apk` |
| Gradle Properties | `android/gradle.properties` |
| App Build Config | `android/app/build.gradle` |
| Root Build Config | `android/build.gradle` |
| Gradle Wrapper | `android/gradle/wrapper/gradle-wrapper.properties` |

## Troubleshooting Commands

### Check Java Version
```bash
java -version
```

### Check Running Gradle Processes
```bash
ps aux | grep gradle
```

### Kill All Gradle Processes
```bash
pkill -9 -f gradle
```

### Check Disk Space
```bash
df -h
```

### Check RAM
```bash
free -h
```

### Clear All Gradle Caches
```bash
rm -rf ~/.gradle/caches
```

### Verify AAB
```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

### Check AAB Size
```bash
du -h android/app/build/outputs/bundle/release/app-release.aab
```

## Memory Adjustments

| System RAM | Recommended -Xmx |
|------------|------------------|
| 4 GB | -Xmx2g |
| 6 GB | -Xmx3g |
| 8+ GB | -Xmx4g |

## Common Error Messages

| Error | Solution |
|-------|----------|
| "Timeout waiting to lock journal cache" | Stop daemons, remove lock file |
| "OutOfMemoryError: Metaspace" | Increase `-XX:MaxMetaspaceSize=1024m` |
| "Could not find method lint()" | Use `lintOptions` instead of `lint` |
| "SDK location not found" | Create `local.properties` with SDK path |
| "Execution failed for task ':app:lintVitalAnalyzeRelease'" | Add lint config or use `-x lint` |

## Environment Variables

```bash
# Isolated Gradle cache
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"

# Gradle options
export GRADLE_OPTS="-Xmx4g -XX:MaxMetaspaceSize=1024m -Dorg.gradle.daemon=false"

# Android SDK (if not set)
export ANDROID_HOME=/path/to/android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
```

## Build Flags Reference

| Flag | Purpose |
|------|---------|
| `--no-daemon` | Disable Gradle daemon |
| `-x lint` | Skip lint checks |
| `--max-workers=2` | Limit parallel workers |
| `-Dorg.gradle.user.home` | Set custom Gradle home |
| `-Dorg.gradle.jvmargs` | Set JVM arguments |
| `--stacktrace` | Show full error stack trace |
| `--info` | Show detailed build info |
| `--debug` | Show debug output |
| `--scan` | Generate build scan |

## Success Indicators

✅ `BUILD SUCCESSFUL in Xm Ys`
✅ AAB file exists and has reasonable size (10-50 MB)
✅ No error messages in console
✅ No "Timeout waiting to lock" errors
✅ No "OutOfMemoryError" messages

## Quick Test

After building, test the AAB:

```bash
# Install bundletool (if not installed)
# Download from: https://github.com/google/bundletool/releases

# Generate APKs from AAB
bundletool build-apks --bundle=android/app/build/outputs/bundle/release/app-release.aab --output=app.apks

# Install on connected device
bundletool install-apks --apks=app.apks
```

## CI/CD Integration

For GitHub Actions, GitLab CI, etc.:

```yaml
- name: Build Release AAB
  run: |
    cd android
    export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"
    ./gradlew --stop || true
    ./gradlew clean --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME"
    ./gradlew :app:bundleRelease --no-daemon \
      -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
      -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" \
      --max-workers=2
```

---

**Keep this reference handy for quick access to commands and configurations!**
