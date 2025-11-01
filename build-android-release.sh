
#!/bin/bash

# TechTime Android Release Build Script
# This script builds the Android app with New Architecture and Hermes enabled

set -e  # Exit on error

echo "=========================================="
echo "TechTime Android Release Build"
echo "New Architecture: ENABLED"
echo "Hermes: ENABLED"
echo "=========================================="

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

# Clean previous builds
echo ""
echo "Cleaning previous builds..."
rm -rf android/.gradle
rm -rf android/build
rm -rf android/app/build
echo "✓ Clean complete"

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
    echo "✗ WARNING: New Architecture not enabled!"
fi

if grep -q "hermesEnabled=true" android/gradle.properties; then
    echo "✓ Hermes enabled"
else
    echo "✗ WARNING: Hermes not enabled!"
fi

# Build release AAB
echo ""
echo "Building release AAB..."
cd android
./gradlew :app:bundleRelease
cd ..

# Check output
if [ -f android/app/build/outputs/bundle/release/app-release.aab ]; then
    echo ""
    echo "=========================================="
    echo "✓ BUILD SUCCESSFUL!"
    echo "=========================================="
    echo "Output: android/app/build/outputs/bundle/release/app-release.aab"
    ls -lh android/app/build/outputs/bundle/release/app-release.aab
else
    echo ""
    echo "=========================================="
    echo "✗ BUILD FAILED!"
    echo "=========================================="
    echo "AAB file not found. Check logs above for errors."
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Test the AAB on a device"
echo "2. Upload to Google Play Console"
echo "3. Submit for review"
echo ""
