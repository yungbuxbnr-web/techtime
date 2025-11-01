
# Apply Android Build Fix - Step-by-Step Checklist

Follow these steps **exactly** to fix KSP Metaspace OOM and lintVitalAnalyzeRelease crashes.

## ⏱️ Estimated Time: 15-20 minutes

---

## 📋 Step-by-Step Instructions

### ✅ Step 1: Verify Prerequisites (2 minutes)

```bash
# Check JDK version (must be 17)
java -version

# Check Node.js version (should be 18+)
node -v

# Check Expo CLI is installed
npx expo --version
```

**Expected**: JDK 17, Node 18+, Expo CLI installed

---

### ✅ Step 2: Set Environment Variable (1 minute)

```bash
# Set NODE_ENV
export NODE_ENV=production

# Create .env file
echo "NODE_ENV=production" > .env
```

**Verify**: `cat .env` should show `NODE_ENV=production`

---

### ✅ Step 3: Install Dependencies (2 minutes)

```bash
npm install
```

**Expected**: All dependencies installed without errors

---

### ✅ Step 4: Prebuild Android (3 minutes)

```bash
expo prebuild -p android --clean
```

**Expected**: Android project generated in `android/` directory

---

### ✅ Step 5: Update gradle.properties (2 minutes)

Open `android/gradle.properties` and **replace or add** these lines:

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

**Verify**: File contains all lines above

---

### ✅ Step 6: Update app/build.gradle (3 minutes)

Open `android/app/build.gradle` and add/update these sections:

**Add inside `android { }` block:**

```groovy
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
```

**Add at the end of the file (outside android block):**

```groovy
tasks.configureEach {
    it.environment("NODE_ENV", "production")
}
```

**Verify**: All sections added to file

---

### ✅ Step 7: Update Root build.gradle (2 minutes)

Open `android/build.gradle` and add these blocks **at the very end**:

```groovy
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

**Verify**: Both subprojects blocks added at end of file

---

### ✅ Step 8: Build Release AAB (10-30 minutes)

```bash
cd android

# Stop any running Gradle daemons
./gradlew --stop

# Clean previous builds
./gradlew clean

# Build release AAB
./gradlew :app:bundleRelease -Dkotlin.daemon.jvm.options=-Xmx3g --no-parallel
```

**Expected**: Build completes successfully without Metaspace OOM

---

### ✅ Step 9: Verify Output (1 minute)

```bash
# Check AAB exists
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# Check size
du -h android/app/build/outputs/bundle/release/app-release.aab
```

**Expected**: AAB file exists, size is 20-50 MB

---

## 🎉 Success!

If you see:

```
BUILD SUCCESSFUL in XXm XXs
```

And the AAB file exists, you're done! 🎊

---

## 🐛 Troubleshooting

### Problem: "Metaspace OOM" still appears

**Solution**: Increase Metaspace in `gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx8g -XX:MaxMetaspaceSize=3072m
```

Then rebuild.

---

### Problem: "lintVitalAnalyzeRelease FAILED"

**Solution**: Verify step 7 was completed correctly. The subprojects block should be at the **very end** of `android/build.gradle`.

---

### Problem: "Could not find or load main class"

**Solution**: Verify JDK 17 is installed and active:

```bash
java -version
# Should show: openjdk version "17.x.x"
```

---

### Problem: Build takes too long or hangs

**Solution**: Ensure only one Gradle daemon is running:

```bash
./gradlew --stop
pkill -f gradle
./gradlew clean
./gradlew :app:bundleRelease -Dkotlin.daemon.jvm.options=-Xmx3g --no-parallel
```

---

## 📝 Quick Reference

### Files Modified

1. ✅ `android/gradle.properties` - Memory and parallelism settings
2. ✅ `android/app/build.gradle` - Lint disabled, Java 17, NODE_ENV
3. ✅ `android/build.gradle` - Disable lintVital tasks, configure KSP

### Build Commands

```bash
cd android
./gradlew --stop
./gradlew clean
./gradlew :app:bundleRelease -Dkotlin.daemon.jvm.options=-Xmx3g --no-parallel
```

### Output Location

```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🚀 Alternative: Use Build Script

Instead of manual steps 8-9, you can use the automated script:

```bash
# Make executable
chmod +x build-android-release.sh

# Run
./build-android-release.sh
```

---

## 📚 More Information

- **Full documentation**: `ANDROID_RELEASE_BUILD_FINAL.md`
- **CI/CD setup**: `android-config-templates/ci-build-commands.md`
- **Templates**: `android-config-templates/` directory

---

## ✅ Final Checklist

Before considering the fix complete, verify:

- [ ] JDK 17 is installed and active
- [ ] `android/gradle.properties` has all memory settings
- [ ] `android/app/build.gradle` has lint disabled and Java 17
- [ ] `android/build.gradle` has both subprojects blocks at the end
- [ ] NODE_ENV=production is set
- [ ] Build completes without Metaspace OOM
- [ ] No lintVitalAnalyzeRelease failures
- [ ] AAB file is generated at expected location
- [ ] AAB size is reasonable (20-50 MB)

---

**Status**: Ready to apply ✅

**Time Required**: 15-20 minutes

**Difficulty**: Easy (copy-paste configuration)

**iOS Impact**: None (iOS builds unaffected)
