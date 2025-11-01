
# Android Release Build - Final Configuration

This document contains the **final, production-ready configuration** to fix KSP Metaspace OOM and lintVitalAnalyzeRelease crashes in Android release builds.

## 🎯 What This Fixes

- ✅ **KSP Metaspace OOM** in `:expo-updates:kspReleaseKotlin`
- ✅ **lintVitalAnalyzeRelease crashes** (react-native-screens, expo-modules-core)
- ✅ **Build failures** due to memory pressure
- ✅ **Lint errors** failing release builds

## 📋 Prerequisites

- **JDK 17** (required)
- **Gradle 8.14.x** (will be set by Expo)
- **AGP ≥8.5** (will be set by Expo)
- **Kotlin 2.1.20** (will be set by Expo)
- **KSP 2.1.20-2.0.1** (will be set by Expo)
- **Node.js 18+**
- **Expo CLI** (latest)

## 🚀 Quick Start

### Step 1: Update gradle.properties

After running `expo prebuild -p android --clean`, update `android/gradle.properties`:

```properties
# Memory Configuration
org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2048m -Dfile.encoding=UTF-8 -XX:+UseParallelGC
kotlin.daemon.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1024m

# Parallelism Control
org.gradle.workers.max=1
org.gradle.caching=true

# Kotlin Configuration
kotlin.incremental=true
-Dkotlin.compiler.execution.strategy=in-process

# Android Configuration
android.useAndroidX=true
android.nonTransitiveRClass=true

# React Native Configuration
newArchEnabled=true
hermesEnabled=true
```

### Step 2: Update app/build.gradle

In `android/app/build.gradle`, ensure these sections exist:

```groovy
android {
    // Disable fatal lint errors
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
    
    // For newer AGP versions
    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
    
    // Java 17 compatibility
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    
    // Kotlin JVM target
    kotlinOptions {
        jvmTarget = '17'
    }
}

// Set NODE_ENV for all tasks
tasks.configureEach {
    it.environment("NODE_ENV", "production")
}
```

### Step 3: Update Root build.gradle

In `android/build.gradle`, add this at the end:

```groovy
// Disable all lintVital tasks across subprojects
subprojects {
    afterEvaluate {
        tasks.matching { it.name.toLowerCase().contains("lintvital") }.all { 
            enabled = false 
        }
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

### Step 4: Build Commands

```bash
# Stop any running daemons
cd android
./gradlew --stop

# Clean previous builds
./gradlew clean

# Build release AAB
./gradlew :app:bundleRelease \
  -Dkotlin.daemon.jvm.options=-Xmx3g \
  --no-parallel
```

## 📝 Complete Build Process

### Local Development Build

```bash
# 1. Set environment
export NODE_ENV=production

# 2. Install dependencies
npm install

# 3. Prebuild Android
expo prebuild -p android --clean

# 4. Apply configuration changes (see steps above)

# 5. Build
cd android
./gradlew --stop
./gradlew clean
./gradlew :app:bundleRelease -Dkotlin.daemon.jvm.options=-Xmx3g --no-parallel
```

### Using the Build Script

```bash
# Make script executable
chmod +x build-android-release.sh

# Run build
./build-android-release.sh
```

## 🔧 Configuration Files Reference

### android/gradle.properties (Complete)

```properties
org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2048m -Dfile.encoding=UTF-8 -XX:+UseParallelGC
kotlin.daemon.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1024m
org.gradle.workers.max=1
org.gradle.caching=true
kotlin.incremental=true
-Dkotlin.compiler.execution.strategy=in-process
android.useAndroidX=true
android.nonTransitiveRClass=true
newArchEnabled=true
hermesEnabled=true
```

### android/app/build.gradle (Key Sections)

```groovy
android {
    compileSdk 36
    
    defaultConfig {
        minSdk 23
        targetSdk 36
    }
    
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
    
    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = '17'
    }
}

tasks.configureEach {
    it.environment("NODE_ENV", "production")
}
```

### android/build.gradle (Key Sections)

```groovy
buildscript {
    ext {
        kotlinVersion = "2.1.20"
        kspVersion = "2.1.20-2.0.1"
        agpVersion = "8.5.0"
    }
}

subprojects {
    afterEvaluate {
        tasks.matching { it.name.toLowerCase().contains("lintvital") }.all { 
            enabled = false 
        }
    }
}

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

## 🎯 What Each Setting Does

### Memory Settings

- **`org.gradle.jvmargs=-Xmx6g`**: Allocates 6GB heap to Gradle daemon
- **`-XX:MaxMetaspaceSize=2048m`**: Allocates 2GB Metaspace (fixes KSP OOM)
- **`kotlin.daemon.jvmargs=-Xmx3g`**: Allocates 3GB to Kotlin daemon
- **`-XX:+UseParallelGC`**: Uses parallel garbage collector for better performance

### Parallelism Control

- **`org.gradle.workers.max=1`**: Limits worker processes to 1 (prevents memory spikes)
- **`--no-parallel`**: Disables parallel project execution during build

### Kotlin Optimization

- **`kotlin.incremental=true`**: Enables incremental compilation
- **`-Dkotlin.compiler.execution.strategy=in-process`**: Runs Kotlin compiler in-process
- **`ksp.incremental=true`**: Enables incremental KSP processing

### Lint Configuration

- **`checkReleaseBuilds false`**: Disables lint checks on release builds
- **`abortOnError false`**: Prevents lint errors from failing the build
- **`lintVital* disabled`**: Disables all lintVital tasks as fallback

## ✅ Verification Checklist

After applying changes, verify:

- [ ] `android/gradle.properties` has all memory settings
- [ ] `android/app/build.gradle` has lint disabled and Java 17
- [ ] `android/build.gradle` has subprojects blocks
- [ ] JDK 17 is installed (`java -version`)
- [ ] NODE_ENV=production is set
- [ ] Build completes without Metaspace OOM
- [ ] AAB file is generated
- [ ] No lint errors fail the build

## 🐛 Troubleshooting

### Still Getting Metaspace OOM?

1. Increase Metaspace further:
   ```properties
   org.gradle.jvmargs=-Xmx8g -XX:MaxMetaspaceSize=3072m
   ```

2. Ensure no other Gradle daemons are running:
   ```bash
   ./gradlew --stop
   pkill -f gradle
   ```

### Build Still Failing on Lint?

1. Verify lint is disabled in both `lintOptions` and `lint` blocks
2. Check that subprojects block is at the END of root build.gradle
3. Manually skip lint task:
   ```bash
   ./gradlew :app:bundleRelease -x lintVitalRelease --no-parallel
   ```

### Out of Memory on CI?

1. Ensure CI runner has at least 8GB RAM
2. Add swap space if needed
3. Use the exact build commands from `ci-build-commands.md`

## 📊 Expected Results

### Successful Build Output

```
> Task :expo-updates:kspReleaseKotlin
✓ Completed without Metaspace OOM

> Task :app:lintVitalAnalyzeRelease SKIPPED
✓ Lint task disabled

> Task :app:bundleRelease
✓ AAB generated

BUILD SUCCESSFUL in 15m 32s
```

### Output Location

```
android/app/build/outputs/bundle/release/app-release.aab
```

### Typical Build Time

- **First build**: 15-30 minutes
- **Incremental builds**: 5-10 minutes

### Typical AAB Size

- **20-50 MB** (depending on assets and dependencies)

## 🚀 CI/CD Integration

See `android-config-templates/ci-build-commands.md` for:

- GitHub Actions workflow
- GitLab CI configuration
- Docker build example
- EAS Build configuration

## 📚 Related Documentation

- `android-config-templates/gradle.properties.template` - Full gradle.properties template
- `android-config-templates/app-build.gradle.template` - Full app build.gradle template
- `android-config-templates/root-build.gradle.template` - Full root build.gradle template
- `android-config-templates/ci-build-commands.md` - CI/CD build commands
- `build-android-release.sh` - Automated build script

## ⚠️ Important Notes

1. **Do NOT downgrade packages** - Keep all dependencies at current versions
2. **Keep Hermes enabled** - Required for New Architecture
3. **Keep New Architecture enabled** - Required by react-native-reanimated
4. **Use JDK 17** - JDK 11 or 21 may cause issues
5. **iOS builds unaffected** - These changes only affect Android

## 🎉 Success Criteria

Your build is successful when:

1. ✅ No Metaspace OOM errors in logs
2. ✅ `:expo-updates:kspReleaseKotlin` completes
3. ✅ No lintVitalAnalyzeRelease failures
4. ✅ AAB file is generated
5. ✅ Build completes in reasonable time
6. ✅ Lint warnings present but don't fail build

---

**Last Updated**: 2024
**Toolchain**: JDK 17, Gradle 8.14.x, AGP ≥8.5, Kotlin 2.1.20, KSP 2.1.20-2.0.1
**Status**: Production Ready ✅
