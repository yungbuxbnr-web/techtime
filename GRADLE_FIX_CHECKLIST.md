
# Gradle Lock Error Fix - Implementation Checklist

Use this checklist to ensure all fixes are properly applied.

## ☐ Step 1: Prerequisites

- [ ] JDK 17 is installed and configured
- [ ] Android SDK is installed
- [ ] `android` folder exists (run `npx expo prebuild -p android` if not)
- [ ] You have terminal/command line access
- [ ] You have write permissions to the project directory

## ☐ Step 2: Stop Gradle Daemons

Run these commands:

```bash
cd android
./gradlew --stop || true
pkill -f 'GradleDaemon' || true
pkill -f 'org.gradle.launcher.daemon' || true
sleep 2
rm -f ~/.gradle/caches/journal-1/journal-1.lock
```

- [ ] All commands executed without errors
- [ ] Lock file removed successfully

## ☐ Step 3: Configure gradle.properties

File: `android/gradle.properties`

Add/merge these lines:

```properties
org.gradle.daemon=false
org.gradle.parallel=false
org.gradle.workers.max=2
org.gradle.vfs.watch=false
org.gradle.caching=true
android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8 -Dkotlin.daemon.jvm.options=-Xmx2g,-XX:MaxMetaspaceSize=1024m
kotlin.incremental=true
ksp.incremental=true
```

- [ ] File updated with all required properties
- [ ] No duplicate entries
- [ ] Memory settings adjusted for your system (if needed)

## ☐ Step 4: Configure app/build.gradle

File: `android/app/build.gradle`

### Add NDK Configuration

Inside `android { defaultConfig { } }`:

```gradle
ndk {
    abiFilters "arm64-v8a"
}
```

- [ ] NDK configuration added

### Add Lint Configuration

Inside `android { }`:

```gradle
lint {
    abortOnError false
    checkReleaseBuilds false
}
```

Or for older AGP:

```gradle
lintOptions {
    abortOnError false
    checkReleaseBuilds false
}
```

- [ ] Lint configuration added

## ☐ Step 5: Configure Root build.gradle

File: `android/build.gradle`

Add at the top level (outside allprojects):

```gradle
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```

- [ ] Java toolchain configuration added

## ☐ Step 6: Set Environment Variables

Before building, run:

```bash
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"
```

- [ ] Environment variable set

## ☐ Step 7: Clean Gradle State

Run:

```bash
rm -rf ~/.gradle/caches/*/fileHashes ~/.gradle/caches/journal-1 || true
./gradlew clean --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME"
```

- [ ] Cache files removed
- [ ] Clean build completed successfully

## ☐ Step 8: Build Release AAB

Run:

```bash
./gradlew :app:bundleRelease --no-daemon \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" \
  --max-workers=2
```

- [ ] Build started without errors
- [ ] Build completed successfully
- [ ] No "Timeout waiting to lock" errors
- [ ] No "OutOfMemoryError: Metaspace" errors

## ☐ Step 9: Verify Build Output

Check:

```bash
ls -lh app/build/outputs/bundle/release/app-release.aab
```

- [ ] AAB file exists
- [ ] File size is reasonable (typically 10-50 MB)
- [ ] File is not corrupted

## ☐ Step 10: Optional - Build APK

If you need an APK:

```bash
./gradlew :app:assembleRelease --no-daemon \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" \
  --max-workers=2
```

- [ ] APK built successfully (if needed)

## Troubleshooting Checklist

If build fails, check:

- [ ] Java version is 17: `java -version`
- [ ] No other Gradle processes running: `ps aux | grep gradle`
- [ ] Sufficient disk space: `df -h`
- [ ] Sufficient RAM: `free -h`
- [ ] All configuration files saved properly
- [ ] No syntax errors in Gradle files
- [ ] Android SDK properly configured
- [ ] `ANDROID_HOME` environment variable set

## Common Issues and Solutions

### Issue: "Could not find method lint()"
- [ ] Changed `lint { }` to `lintOptions { }` in app/build.gradle

### Issue: Still getting lock errors
- [ ] Verified all Gradle daemons stopped
- [ ] Manually deleted `~/.gradle/caches/journal-1` directory
- [ ] Rebooted system (last resort)

### Issue: Out of memory errors
- [ ] Reduced `-Xmx4g` to `-Xmx3g` or `-Xmx2g`
- [ ] Closed other applications
- [ ] Verified `-XX:MaxMetaspaceSize=1024m` is set

### Issue: Build succeeds but AAB not found
- [ ] Checked alternative output locations
- [ ] Verified build type is `release` not `debug`
- [ ] Checked for build errors in console output

## Final Verification

- [ ] AAB file exists at: `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] AAB file size is reasonable
- [ ] Build completed without errors
- [ ] Ready to upload to Google Play Console

## Documentation

- [ ] Saved all configuration changes to version control
- [ ] Documented any custom modifications
- [ ] Noted system-specific settings (memory allocation, etc.)

## Success Criteria

✅ All checklist items completed
✅ AAB file generated successfully
✅ No Gradle lock errors
✅ No memory errors
✅ Build time is reasonable (5-15 minutes)

---

**Date Completed:** _______________
**Build Time:** _______________
**AAB Size:** _______________
**Notes:** _______________________________________________
