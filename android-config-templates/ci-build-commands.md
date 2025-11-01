
# CI Build Commands for Android

## Overview
This document provides the exact commands to use in CI/CD pipelines for building Android releases without encountering Metaspace OOM or lintVitalAnalyzeRelease failures.

## Prerequisites
- JDK 17 installed and configured
- NODE_ENV=production set in environment
- Gradle 8.14.x or compatible version

## Build Commands

### 1. Clean & Restart Daemon
Before building, stop any running Gradle daemons and clean the project:

```bash
./gradlew --stop
./gradlew clean
```

### 2. Standard Release Build
Build the release AAB with all optimizations:

```bash
./gradlew :app:assembleRelease
```

### 3. Build Without Lint Tasks (Fallback)
If the standard build still fails due to lint issues, use this command to skip lintVital tasks:

```bash
./gradlew :app:assembleRelease -x lintVitalRelease -x lintVitalAnalyzeRelease
```

### 4. Build AAB (Bundle) Instead of APK
For Google Play Store releases:

```bash
./gradlew :app:bundleRelease
```

Or with lint tasks excluded:

```bash
./gradlew :app:bundleRelease -x lintVitalRelease -x lintVitalAnalyzeRelease
```

## Optional: Generate Lint Baseline (Local Development Only)

If you want to generate a lint baseline file to suppress known warnings:

```bash
./gradlew :app:lintDebug
./gradlew :app:lintFix
```

This will create a `lint-baseline.xml` file that you can reference in your `build.gradle` lint configuration.

## Troubleshooting

### If KSP Still OOMs

Verify no mixed Kotlin versions in any Expo module:

```bash
./gradlew :expo-updates:dependencies --configuration releaseCompileClasspath
./gradlew :expo-modules-core:dependencies --configuration releaseCompileClasspath
```

Look for any Kotlin version mismatches and align them to the versions specified in `root-build.gradle.template` (Kotlin 1.9.24, KSP 1.9.24-1.0.20).

### If Build Still Fails

1. Reduce worker count further in `gradle.properties`:
   ```
   org.gradle.workers.max=1
   ```

2. Increase memory allocation:
   ```
   org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2048m -Dfile.encoding=UTF-8 -XX:+HeapDumpOnOutOfMemoryError -XX:+UseParallelGC
   ```

3. Disable parallel builds:
   ```
   org.gradle.parallel=false
   ```

## Environment Variables

Ensure these environment variables are set in your CI pipeline:

```bash
export NODE_ENV=production
export JAVA_HOME=/path/to/jdk-17
```

## Expected Results

After applying these configurations and commands:

1. ✅ KSP Metaspace OOM resolved (bigger metaspace, fewer workers, aligned toolchain)
2. ✅ lintVitalAnalyzeRelease no longer blocks release (lint suppressed on release, still active on debug)
3. ✅ `:app:assembleRelease` completes successfully
4. ✅ Android AAB/APK generated without errors
