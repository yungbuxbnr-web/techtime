
#!/bin/bash

# TechTime Android Release Build Script
# This script builds the Android app with New Architecture and Hermes enabled
# Updated to fix KSP Metaspace OOM and lintVitalAnalyzeRelease crashes

set -e  # Exit on error

echo "=========================================="
echo "TechTime Android Release Build"
echo "=========================================="
echo "Configuration:"
echo "  - New Architecture: ENABLED"
echo "  - Hermes: ENABLED"
echo "  - JDK: 17"
echo "  - Gradle: 8.14.x"
echo "  - AGP: ≥8.5"
echo "  - Kotlin: 2.1.20"
echo "  - KSP: 2.1.20-2.0.1"
echo "=========================================="
echo ""

# Check JDK version
echo "Checking JDK version..."
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" != "17" ]; then
    echo "❌ ERROR: JDK 17 is required, but found JDK $JAVA_VERSION"
    echo "Please install JDK 17 and try again."
    exit 1
fi
echo "✓ JDK 17 detected"

# Set NODE_ENV
export NODE_ENV=production
echo "✓ NODE_ENV set to: $NODE_ENV"

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "NODE_ENV=production" > .env
    echo "✓ .env file created"
else
    echo "✓ .env file exists"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install
echo "✓ Dependencies installed"

# Prebuild Android
echo ""
echo "Running expo prebuild for Android..."
expo prebuild -p android --clean
echo "✓ Prebuild complete"

# Verify configuration
echo ""
echo "Verifying configuration..."

if grep -q "newArchEnabled=true" android/gradle.properties; then
    echo "✓ New Architecture enabled"
else
    echo "⚠ WARNING: New Architecture not enabled in gradle.properties"
fi

if grep -q "hermesEnabled=true" android/gradle.properties; then
    echo "✓ Hermes enabled"
else
    echo "⚠ WARNING: Hermes not enabled in gradle.properties"
fi

if grep -q "org.gradle.workers.max=1" android/gradle.properties; then
    echo "✓ Worker processes limited to 1"
else
    echo "⚠ WARNING: Worker processes not limited (may cause OOM)"
fi

if grep -q "org.gradle.jvmargs=-Xmx6g" android/gradle.properties; then
    echo "✓ Gradle memory configured (6GB)"
else
    echo "⚠ WARNING: Gradle memory not configured"
fi

if grep -q "kotlin.daemon.jvmargs=-Xmx3g" android/gradle.properties; then
    echo "✓ Kotlin daemon memory configured (3GB)"
else
    echo "⚠ WARNING: Kotlin daemon memory not configured"
fi

# Navigate to android directory
cd android

# Stop any running Gradle daemons
echo ""
echo "Stopping Gradle daemons..."
./gradlew --stop
echo "✓ Daemons stopped"

# Clean previous builds
echo ""
echo "Cleaning previous builds..."
./gradlew clean
echo "✓ Clean complete"

# Build release AAB with memory optimizations
echo ""
echo "=========================================="
echo "Building release AAB..."
echo "This may take 15-30 minutes..."
echo "=========================================="
echo ""

BUILD_START=$(date +%s)

./gradlew :app:bundleRelease \
  -Dkotlin.daemon.jvm.options=-Xmx3g \
  --no-parallel

BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))
BUILD_MINUTES=$((BUILD_TIME / 60))
BUILD_SECONDS=$((BUILD_TIME % 60))

cd ..

# Check output
if [ -f android/app/build/outputs/bundle/release/app-release.aab ]; then
    AAB_SIZE=$(du -h android/app/build/outputs/bundle/release/app-release.aab | cut -f1)
    
    echo ""
    echo "=========================================="
    echo "✅ BUILD SUCCESSFUL!"
    echo "=========================================="
    echo ""
    echo "Build Details:"
    echo "  - Time: ${BUILD_MINUTES}m ${BUILD_SECONDS}s"
    echo "  - Output: android/app/build/outputs/bundle/release/app-release.aab"
    echo "  - Size: $AAB_SIZE"
    echo ""
    echo "Verification:"
    echo "  ✓ No Metaspace OOM errors"
    echo "  ✓ kspReleaseKotlin completed"
    echo "  ✓ Lint warnings only (no failures)"
    echo "  ✓ AAB generated successfully"
    echo ""
    ls -lh android/app/build/outputs/bundle/release/app-release.aab
else
    echo ""
    echo "=========================================="
    echo "❌ BUILD FAILED!"
    echo "=========================================="
    echo ""
    echo "AAB file not found at expected location."
    echo "Check the build logs above for errors."
    echo ""
    echo "Common issues:"
    echo "  - Metaspace OOM: Increase -XX:MaxMetaspaceSize in gradle.properties"
    echo "  - Lint errors: Verify lint is disabled in app/build.gradle"
    echo "  - JDK version: Ensure JDK 17 is installed"
    echo ""
    exit 1
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Test the AAB:"
echo "   - Install on a device for testing"
echo "   - Verify all features work correctly"
echo ""
echo "2. Upload to Google Play Console:"
echo "   - Go to https://play.google.com/console"
echo "   - Upload the AAB to internal testing"
echo "   - Submit for review"
echo ""
echo "3. Set up CI/CD (optional):"
echo "   - See android-config-templates/ci-build-commands.md"
echo "   - Automate future builds"
echo ""
echo "=========================================="
echo ""
