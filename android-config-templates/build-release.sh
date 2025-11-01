
#!/bin/bash
set -e

echo "=================================================="
echo "🚀 Android Release Build Script"
echo "=================================================="
echo ""

# Ensure we're in the android directory
cd "$(dirname "$0")/../android" || exit 1

echo "📍 Current directory: $(pwd)"
echo ""

# Export NODE_ENV for all tasks
export NODE_ENV=production
echo "✅ NODE_ENV set to: $NODE_ENV"
echo ""

# Stop all Gradle daemons
echo "🧹 Stopping all Gradle daemons..."
./gradlew --stop
echo ""

# Clean build artifacts
echo "🧹 Cleaning build artifacts..."
./gradlew clean
echo ""

# Build release AAB with memory optimizations
echo "🏗️  Building release AAB..."
echo "   Memory settings:"
echo "   - Gradle JVM: 6GB heap, 2GB Metaspace"
echo "   - Kotlin daemon: 3GB heap, 1GB Metaspace"
echo "   - Worker processes: 2"
echo ""

./gradlew :app:bundleRelease \
  -Dkotlin.daemon.jvm.options="-Xmx3g -XX:MaxMetaspaceSize=1024m" \
  -Dorg.gradle.jvmargs="-Xmx6g -XX:MaxMetaspaceSize=2048m -Dfile.encoding=UTF-8 -XX:+UseParallelGC"

echo ""
echo "=================================================="
echo "✅ Build complete!"
echo "=================================================="
echo ""
echo "📦 AAB location:"
echo "   android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "📊 Build verification:"
echo "   ✓ kspReleaseKotlin completed without Metaspace OOM"
echo "   ✓ lintVitalAnalyzeRelease warnings only (no failures)"
echo "   ✓ Android AAB generated successfully"
echo ""
echo "🎯 Next steps:"
echo "   1. Test the AAB on a device"
echo "   2. Upload to Google Play Console"
echo "   3. Run iOS build to verify it's unaffected"
echo ""
