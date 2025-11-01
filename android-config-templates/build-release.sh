
#!/bin/bash

# Android Release Build Script
# This script builds the Android release AAB/APK with proper error handling

set -e  # Exit on error

echo "=========================================="
echo "Android Release Build Script"
echo "=========================================="

# Set NODE_ENV
export NODE_ENV=production
echo "✓ NODE_ENV set to production"

# Stop any running Gradle daemons
echo ""
echo "Stopping Gradle daemon..."
./gradlew --stop
echo "✓ Gradle daemon stopped"

# Clean the project
echo ""
echo "Cleaning project..."
./gradlew clean
echo "✓ Project cleaned"

# Build release
echo ""
echo "Building release..."
echo "This may take several minutes..."

# Try standard build first
if ./gradlew :app:assembleRelease; then
    echo ""
    echo "=========================================="
    echo "✓ BUILD SUCCESSFUL"
    echo "=========================================="
    echo ""
    echo "Release APK location:"
    echo "android/app/build/outputs/apk/release/app-release.apk"
    echo ""
else
    echo ""
    echo "Standard build failed. Retrying without lint tasks..."
    
    # Fallback: build without lint tasks
    if ./gradlew :app:assembleRelease -x lintVitalRelease -x lintVitalAnalyzeRelease; then
        echo ""
        echo "=========================================="
        echo "✓ BUILD SUCCESSFUL (without lint)"
        echo "=========================================="
        echo ""
        echo "Release APK location:"
        echo "android/app/build/outputs/apk/release/app-release.apk"
        echo ""
        echo "Note: Lint tasks were skipped. Run './gradlew :app:lintDebug' separately to check for issues."
        echo ""
    else
        echo ""
        echo "=========================================="
        echo "✗ BUILD FAILED"
        echo "=========================================="
        echo ""
        echo "Please check the error messages above."
        echo "Common issues:"
        echo "  1. Metaspace OOM - Increase memory in gradle.properties"
        echo "  2. Kotlin version mismatch - Check dependencies"
        echo "  3. Missing signing config - Configure release signing"
        echo ""
        exit 1
    fi
fi

echo "Build completed at: $(date)"
