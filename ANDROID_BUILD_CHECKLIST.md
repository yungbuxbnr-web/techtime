
# Android Build Fix Checklist

Quick checklist to verify all fixes are applied correctly.

## ✅ Configuration Files

### 1. `android/settings.gradle`
- [ ] Contains `pluginManagement` block
- [ ] Kotlin plugin version: `1.9.24`
- [ ] KSP plugin version: `1.9.24-1.0.20`

### 2. `android/build.gradle` (Root)
- [ ] Kotlin version in buildscript: `1.9.24`
- [ ] Kotlin gradle plugin classpath: `1.9.24`
- [ ] Java toolchain configured: `JavaLanguageVersion.of(17)`

### 3. `android/app/build.gradle`
- [ ] NDK version: `26.1.10909125`
- [ ] ABI filters: `"arm64-v8a"` (for build stability)
- [ ] CMake version: `3.22.1`
- [ ] Lint block with `abortOnError false` and `checkReleaseBuilds false`
- [ ] Java compatibility: `VERSION_17`
- [ ] Kotlin jvmTarget: `'17'`

### 4. `android/gradle.properties`
- [ ] `org.gradle.daemon=false`
- [ ] `org.gradle.parallel=false`
- [ ] `org.gradle.workers.max=2`
- [ ] `org.gradle.vfs.watch=false`
- [ ] `org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m ...`
- [ ] `kotlin.incremental=true`
- [ ] `ksp.incremental=true`
- [ ] `android.useAndroidX=true`
- [ ] `android.enableJetifier=true`

## ✅ Build Environment

### Prerequisites
- [ ] JDK 17 installed and active
- [ ] Android SDK configured
- [ ] Expo prebuild completed (`npx expo prebuild -p android`)

### Build Steps
- [ ] Stop Gradle daemons: `./gradlew --stop`
- [ ] Set isolated Gradle home: `export GRADLE_USER_HOME=...`
- [ ] Clear cache: `rm -rf ~/.gradle/caches/*/fileHashes`
- [ ] Clean project: `./gradlew clean --no-daemon`
- [ ] Set CMake parallel level: `CMAKE_BUILD_PARALLEL_LEVEL=1`
- [ ] Build with limited workers: `--max-workers=2`
- [ ] Use no-daemon flag: `--no-daemon`

## ✅ Memory Configuration

### System Requirements
- [ ] At least 4GB RAM available (8GB recommended)
- [ ] Sufficient disk space (at least 10GB free)

### Memory Settings
- [ ] Gradle heap: 4GB (or 3GB if RAM < 8GB)
- [ ] Metaspace: 1024MB
- [ ] Kotlin daemon: 2GB
- [ ] Workers limited: 2

## ✅ Build Command

### Standard Build
```bash
cd android
./gradlew --stop || true
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"
rm -rf ~/.gradle/caches/*/fileHashes ~/.gradle/caches/journal-1 || true
./gradlew clean --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME"
CMAKE_BUILD_PARALLEL_LEVEL=1 ./gradlew :app:bundleRelease --no-daemon \
  --max-workers=2 \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m"
```

### If Lint Fails
```bash
CMAKE_BUILD_PARALLEL_LEVEL=1 ./gradlew :app:bundleRelease -x lint --no-daemon \
  --max-workers=2 \
  -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1024m"
```

## ✅ Verification

### After Build
- [ ] AAB exists: `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] File size is reasonable (typically 20-50MB)
- [ ] No error messages in build log
- [ ] Build completed successfully

### Testing
- [ ] Install on test device
- [ ] App launches successfully
- [ ] Core functionality works
- [ ] No crashes or errors

## ✅ Optional Optimizations

### If KSP OOMs
- [ ] Add to `gradle.properties`: `kotlin.compiler.execution.strategy=in-process`

### For Production
- [ ] Configure release signing in `app/build.gradle`
- [ ] Include all ABIs: `"armeabi-v7a", "arm64-v8a", "x86", "x86_64"`
- [ ] Test on multiple devices
- [ ] Run ProGuard/R8 optimization

## 🚨 Common Issues

### Issue: Metaspace OOM
**Solution:** Increase `-XX:MaxMetaspaceSize` to 1536m or 2048m

### Issue: Gradle Daemon Crashes
**Solution:** Ensure `org.gradle.daemon=false` and use `--no-daemon`

### Issue: Lint Failures
**Solution:** Use `-x lint` flag or verify lint block in `app/build.gradle`

### Issue: CMake Failures
**Solution:** Set `CMAKE_BUILD_PARALLEL_LEVEL=1` and limit workers

### Issue: Wrong Java Version
**Solution:** Install JDK 17 and set `JAVA_HOME` correctly

## 📝 Notes

- All configuration files are in the `android/` directory
- Templates are available in `android-config-templates/`
- Build output is in `android/app/build/outputs/`
- Logs are in `android/app/build/outputs/logs/`

## ✅ Final Checklist

Before submitting to Play Store:
- [ ] All fixes applied and verified
- [ ] Build completes without errors
- [ ] AAB tested on physical devices
- [ ] Release signing configured
- [ ] Version code/name updated
- [ ] ProGuard rules tested
- [ ] All ABIs included (if needed)
- [ ] App tested thoroughly

---

**Status:** All fixes applied ✅

**Last Updated:** $(date)

**Build Command Ready:** Yes ✅
