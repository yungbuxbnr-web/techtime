
# CI/CD Build Commands for Android

This document provides the exact commands to use in CI/CD pipelines to build Android releases without Metaspace OOM errors.

## GitHub Actions Example

```yaml
name: Android Release Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Set NODE_ENV
        run: echo "NODE_ENV=production" >> $GITHUB_ENV
      
      - name: Stop Gradle daemons
        working-directory: android
        run: ./gradlew --stop
      
      - name: Clean build
        working-directory: android
        run: ./gradlew clean
      
      - name: Build release AAB
        working-directory: android
        run: |
          ./gradlew :app:bundleRelease \
            -Dkotlin.daemon.jvm.options=-Xmx3g \
            --no-parallel
      
      - name: Upload AAB
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: android/app/build/outputs/bundle/release/app-release.aab
```

## GitLab CI Example

```yaml
android-build:
  stage: build
  image: openjdk:17-jdk
  
  before_script:
    - apt-get update && apt-get install -y nodejs npm
    - npm install
    - export NODE_ENV=production
  
  script:
    - cd android
    - ./gradlew --stop
    - ./gradlew clean
    - |
      ./gradlew :app:bundleRelease \
        -Dkotlin.daemon.jvm.options=-Xmx3g \
        --no-parallel
  
  artifacts:
    paths:
      - android/app/build/outputs/bundle/release/app-release.aab
    expire_in: 1 week
```

## EAS Build (Expo Application Services)

Update your `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "gradleCommand": ":app:bundleRelease",
        "env": {
          "NODE_ENV": "production"
        }
      }
    }
  }
}
```

Then build with:

```bash
NODE_ENV=production eas build --platform android --profile production
```

## Local Build Script

```bash
#!/bin/bash
set -e

# Navigate to project root
cd "$(dirname "$0")"

# Set environment
export NODE_ENV=production

# Install dependencies
npm install

# Navigate to android directory
cd android

# Stop daemons
./gradlew --stop

# Clean
./gradlew clean

# Build with memory optimizations and no parallelism
./gradlew :app:bundleRelease \
  -Dkotlin.daemon.jvm.options=-Xmx3g \
  --no-parallel

echo "✅ Build complete!"
echo "📦 AAB: android/app/build/outputs/bundle/release/app-release.aab"
```

## Docker Build Example

```dockerfile
FROM openjdk:17-jdk

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN npm install

# Set environment
ENV NODE_ENV=production

# Build Android
WORKDIR /app/android
RUN ./gradlew --stop
RUN ./gradlew clean
RUN ./gradlew :app:bundleRelease \
    -Dkotlin.daemon.jvm.options=-Xmx3g \
    --no-parallel

# Output location
RUN echo "AAB: /app/android/app/build/outputs/bundle/release/app-release.aab"
```

## Environment Variables

Set these in your CI/CD environment:

```bash
# Required
NODE_ENV=production

# Optional (for signing)
KEYSTORE_PASSWORD=your_keystore_password
KEY_ALIAS=your_key_alias
KEY_PASSWORD=your_key_password
```

## Memory Requirements

Ensure your CI/CD runner has:

- **Minimum RAM**: 8GB
- **Recommended RAM**: 16GB
- **Swap space**: 4GB+ (if RAM < 16GB)

## Troubleshooting CI Builds

### Out of Memory in CI

If CI still runs out of memory:

1. **Reduce worker processes** in `gradle.properties`:
   ```properties
   org.gradle.workers.max=1
   ```

2. **Disable parallel builds**:
   ```properties
   org.gradle.parallel=false
   ```

3. **Skip lint task** (already disabled via lintOptions, but can be explicit):
   ```bash
   ./gradlew :app:bundleRelease -x lintVitalRelease --no-parallel
   ```

### Slow CI Builds

Enable Gradle caching in CI:

```yaml
# GitHub Actions
- name: Cache Gradle
  uses: actions/cache@v3
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
```

### Build Timeout

Increase timeout in CI configuration:

```yaml
# GitHub Actions
jobs:
  build:
    timeout-minutes: 60
```

## Verification Commands

After build completes, verify:

```bash
# Check AAB exists
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# Check AAB size (should be reasonable)
du -h android/app/build/outputs/bundle/release/app-release.aab

# Verify AAB contents
unzip -l android/app/build/outputs/bundle/release/app-release.aab
```

## Success Criteria

Build is successful when:

1. ✅ No Metaspace OOM errors
2. ✅ `kspReleaseKotlin` task completes
3. ✅ `lintVitalAnalyzeRelease` shows warnings only (no failures)
4. ✅ AAB file is generated
5. ✅ AAB size is reasonable (typically 20-50MB)
6. ✅ Build completes in reasonable time (< 30 minutes)

## Key Changes from Previous Version

- **Added `--no-parallel` flag** to all build commands to minimize parallelism
- **Simplified Kotlin daemon options** to `-Dkotlin.daemon.jvm.options=-Xmx3g`
- **Removed explicit Gradle JVM args** from command line (now handled by gradle.properties)
- **Set `org.gradle.workers.max=1`** in gradle.properties for maximum stability
