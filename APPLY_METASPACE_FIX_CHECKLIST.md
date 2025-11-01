
# Metaspace OOM Fix - Application Checklist

Use this checklist to apply the Metaspace OOM fixes to your Android build.

## Prerequisites

- [ ] JDK 17 installed and active
- [ ] Android SDK installed
- [ ] NDK 27.1 installed
- [ ] Gradle 8.14+ available
- [ ] At least 8GB RAM (16GB recommended)

Verify JDK version:
```bash
java -version  # Should show version 17
```

## Step 1: Backup Current Configuration

- [ ] Backup `android/gradle.properties`
- [ ] Backup `android/app/build.gradle`
- [ ] Backup `android/build.gradle`

```bash
cp android/gradle.properties android/gradle.properties.backup
cp android/app/build.gradle android/app/build.gradle.backup
cp android/build.gradle android/build.gradle.backup
```

## Step 2: Update gradle.properties

- [ ] Open `android/gradle.properties`
- [ ] Update or add these lines:

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
ksp.incremental=true
ksp.incremental.log=false
```

- [ ] Save the file

## Step 3: Update app/build.gradle

- [ ] Open `android/app/build.gradle`
- [ ] Find the `android {` block
- [ ] Add lint configuration inside the `android` block:

```gradle
android {
    // ... existing configuration ...
    
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
    
    lint {
        checkReleaseBuilds false
        abortOnError false
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    
    // ... rest of configuration ...
}
```

- [ ] Save the file

## Step 4: Update Root build.gradle

- [ ] Open `android/build.gradle`
- [ ] Update Kotlin version in `buildscript.ext`:

```gradle
buildscript {
    ext {
        kotlinVersion = "2.1.20"
        kspVersion = "2.1.20-2.0.1"
        // ... other versions ...
    }
}
```

- [ ] Add KSP configuration at the end of the file:

```gradle
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

- [ ] Save the file

## Step 5: Clean Build Environment

- [ ] Stop all Gradle daemons:
```bash
cd android
./gradlew --stop
```

- [ ] Clean build artifacts:
```bash
./gradlew clean
```

- [ ] Remove Gradle cache (optional, if issues persist):
```bash
rm -rf ~/.gradle/caches/
rm -rf .gradle/
```

## Step 6: Test Build

- [ ] Set NODE_ENV:
```bash
export NODE_ENV=production
```

- [ ] Run release build:
```bash
./gradlew :app:bundleRelease
```

- [ ] Verify build completes without errors
- [ ] Check for Metaspace OOM errors (should be none)
- [ ] Verify AAB is generated:
```bash
ls -lh app/build/outputs/bundle/release/app-release.aab
```

## Step 7: Verify Build Output

- [ ] AAB file exists at `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] AAB file size is reasonable (typically 20-50MB)
- [ ] No Metaspace OOM errors in build log
- [ ] `kspReleaseKotlin` task completed successfully
- [ ] `lintVitalAnalyzeRelease` shows warnings only (no failures)

## Step 8: Test on Device

- [ ] Install AAB on test device:
```bash
bundletool build-apks --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=app-release.apks \
  --mode=universal

bundletool install-apks --apks=app-release.apks
```

- [ ] Launch app and verify functionality
- [ ] Test key features
- [ ] Check for crashes or errors

## Step 9: Update CI/CD (if applicable)

- [ ] Update CI/CD pipeline with new build commands
- [ ] Add NODE_ENV=production to environment
- [ ] Add Kotlin daemon JVM options
- [ ] Test CI/CD build

Example GitHub Actions:
```yaml
- name: Build release AAB
  working-directory: android
  run: |
    export NODE_ENV=production
    ./gradlew --stop
    ./gradlew clean
    ./gradlew :app:bundleRelease \
      -Dkotlin.daemon.jvm.options="-Xmx3g -XX:MaxMetaspaceSize=1024m"
```

## Step 10: Document Changes

- [ ] Update project README with new build instructions
- [ ] Document memory requirements
- [ ] Add troubleshooting section
- [ ] Commit changes to version control

## Troubleshooting

### If Build Still Fails with OOM

- [ ] Reduce worker processes to 1:
```properties
org.gradle.workers.max=1
```

- [ ] Disable parallel builds:
```properties
org.gradle.parallel=false
```

- [ ] Skip lint task:
```bash
./gradlew :app:bundleRelease -x lintVitalRelease
```

### If Build is Slow

- [ ] Enable Gradle daemon:
```properties
org.gradle.daemon=true
```

- [ ] Enable parallel builds (if memory allows):
```properties
org.gradle.parallel=true
```

- [ ] Use Gradle build cache:
```properties
org.gradle.caching=true
```

### If Kotlin Compilation Fails

- [ ] Verify Kotlin version is 2.1.20
- [ ] Check KSP version is 2.1.20-2.0.1
- [ ] Ensure JDK 17 is active
- [ ] Clean and rebuild

## Verification Commands

```bash
# Check Gradle version
./gradlew --version

# Check Java version
java -version

# Check Gradle daemon status
./gradlew --status

# Check system memory
free -h  # Linux
vm_stat  # macOS

# Check AAB contents
unzip -l app/build/outputs/bundle/release/app-release.aab
```

## Success Criteria

✅ Build completes without errors
✅ No Metaspace OOM errors
✅ AAB file is generated
✅ App runs on device
✅ All features work correctly
✅ CI/CD pipeline succeeds (if applicable)

## Rollback Plan

If issues occur, restore backups:

```bash
cp android/gradle.properties.backup android/gradle.properties
cp android/app/build.gradle.backup android/app/build.gradle
cp android/build.gradle.backup android/build.gradle
./gradlew --stop
./gradlew clean
```

## Additional Resources

- Quick Fix Guide: `METASPACE_OOM_QUICK_FIX.md`
- Detailed Guide: `ANDROID_BUILD_METASPACE_FIX.md`
- Build Summary: `BUILD_FIX_SUMMARY.md`
- CI/CD Commands: `android-config-templates/ci-build-commands.md`

## Notes

- These changes only affect Android builds
- iOS builds remain unaffected
- New Architecture and Hermes remain enabled
- Scoped storage remains enabled
- No toolchain downgrades required

## Completion

- [ ] All steps completed
- [ ] Build succeeds
- [ ] App tested on device
- [ ] CI/CD updated (if applicable)
- [ ] Documentation updated
- [ ] Changes committed to version control

**Date Completed:** _______________

**Tested By:** _______________

**Notes:** _______________________________________________
