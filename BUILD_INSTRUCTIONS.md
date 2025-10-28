
# Quick Build Instructions

## Prerequisites Check

Before starting, verify:

```bash
# Check Java version (should be 17)
java -version

# Check if android folder exists
ls -la android/

# If android folder doesn't exist, generate it first:
npx expo prebuild -p android
```

## Quick Build Steps

### 1. Navigate to Android Directory
```bash
cd android
```

### 2. Stop All Gradle Processes
```bash
./gradlew --stop || true
pkill -f 'GradleDaemon' || true
pkill -f 'org.gradle.launcher.daemon' || true
sleep 2
rm -f ~/.gradle/caches/journal-1/journal-1.lock
```

### 3. Set Isolated Gradle Cache
```bash
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"
```

### 4. Update Configuration Files

Copy the contents from the template files in `android-config-templates/` to your actual Android configuration files:

- `gradle.properties.template` → `android/gradle.properties`
- `app-build.gradle.template` → `android/app/build.gradle`
- `root-build.gradle.template` → `android/build.gradle`

**Important:** Merge the configurations, don't replace entire files. Keep your existing app-specific settings.

### 5. Clean Build
```bash
rm -rf ~/.gradle/caches/*/fileHashes ~/.gradle/caches/journal-1 || true
./gradlew clean --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME"
```

### 6. Build Release AAB
```bash
./gradlew :app:bundleRelease --no-daemon \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" \
  --max-workers=2
```

### 7. Find Your AAB
```bash
ls -lh app/build/outputs/bundle/release/
```

Your AAB will be at: `app/build/outputs/bundle/release/app-release.aab`

## If Build Fails

### Try without lint:
```bash
./gradlew :app:bundleRelease -x lint --no-daemon \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" \
  --max-workers=2
```

### If memory errors persist:
Reduce memory in the command:
```bash
./gradlew :app:bundleRelease --no-daemon \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx3g -XX:MaxMetaspaceSize=1024m" \
  --max-workers=2
```

## Build APK Instead

If you need an APK for testing:
```bash
./gradlew :app:assembleRelease --no-daemon \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m" \
  --max-workers=2
```

APK location: `app/build/outputs/apk/release/app-release.apk`

## Verification

After successful build:

```bash
# Check AAB size
ls -lh app/build/outputs/bundle/release/app-release.aab

# Verify AAB integrity (optional)
bundletool validate --bundle=app/build/outputs/bundle/release/app-release.aab
```

## Common Issues

### "Could not find method lint()"
- You're using an older AGP version
- Change `lint { }` to `lintOptions { }` in `app/build.gradle`

### "Timeout waiting to lock"
- Run the stop commands again
- Delete `~/.gradle/caches/journal-1` manually
- Ensure no other Gradle processes: `ps aux | grep gradle`

### "OutOfMemoryError: Metaspace"
- Reduce `-Xmx4g` to `-Xmx3g` or `-Xmx2g`
- Ensure `-XX:MaxMetaspaceSize=1024m` is set
- Close other applications to free up RAM

### "SDK location not found"
- Create `android/local.properties`:
  ```
  sdk.dir=/path/to/Android/sdk
  ```

## Success Indicators

You'll know the build succeeded when you see:
```
BUILD SUCCESSFUL in Xm Ys
```

And the file exists:
```bash
$ ls -lh app/build/outputs/bundle/release/app-release.aab
-rw-r--r-- 1 user user 25M Jan 1 12:00 app-release.aab
```

## Next Steps

1. Upload AAB to Google Play Console
2. Test on physical devices
3. Submit for review

---

**Need Help?** Check the detailed guide in `ANDROID_BUILD_FIX_GUIDE.md`
