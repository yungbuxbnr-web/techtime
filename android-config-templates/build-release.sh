
#!/bin/bash

# Android Release Build Script with Memory Optimization
# This script builds a release APK with proper memory settings

set -e  # Exit on error

echo "=========================================="
echo "Android Release Build - Memory Optimized"
echo "=========================================="
echo ""

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check Java version
echo "Checking Java version..."
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" != "17" ]; then
    echo "⚠️  Warning: Java 17 is recommended. Current version: $JAVA_VERSION"
    echo "   Install Java 17 for best results"
fi

# Step 1: Clean previous builds
echo ""
echo "Step 1: Cleaning previous builds..."
rm -rf android/build
rm -rf android/app/build
rm -rf node_modules/.cache
echo "✓ Clean complete"

# Step 2: Run prebuild to apply templates
echo ""
echo "Step 2: Running expo prebuild..."
npx expo prebuild --clean --platform android
echo "✓ Prebuild complete"

# Step 3: Copy gradle.properties template if needed
echo ""
echo "Step 3: Ensuring gradle.properties has memory optimizations..."
if [ -f "android-config-templates/gradle.properties.template" ]; then
    cp android-config-templates/gradle.properties.template android/gradle.properties
    echo "✓ gradle.properties updated with memory optimizations"
else
    echo "⚠️  Warning: gradle.properties.template not found"
fi

# Step 4: Build release APK
echo ""
echo "Step 4: Building release APK..."
echo "This may take 10-20 minutes on first build..."
echo ""

cd android
./gradlew clean
./gradlew assembleRelease --no-daemon --max-workers=2

# Check if build succeeded
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo ""
    echo "=========================================="
    echo "✓ BUILD SUCCESSFUL!"
    echo "=========================================="
    echo ""
    echo "APK Location:"
    echo "  android/app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "APK Size:"
    ls -lh app/build/outputs/apk/release/app-release.apk | awk '{print "  " $5}'
    echo ""
else
    echo ""
    echo "=========================================="
    echo "❌ BUILD FAILED"
    echo "=========================================="
    echo ""
    echo "Check the error messages above for details."
    echo "Common fixes:"
    echo "  1. Ensure you have at least 6GB free RAM"
    echo "  2. Close other applications"
    echo "  3. Try building with fewer workers: ./gradlew assembleRelease --max-workers=1"
    echo ""
    exit 1
fi

cd ..
