
#!/usr/bin/env bash

# EAS Build Pre-Install Hook
# This script runs before dependencies are installed
# It ensures a clean Gradle environment to prevent cache locking

set -e

echo "🚀 EAS Build Pre-Install Hook"
echo "=============================="

# Detect if we're in a CI/EAS environment
if [ "$EAS_BUILD" = "true" ] || [ "$CI" = "true" ]; then
  echo "✅ Running in CI/EAS Build environment"
  
  # Kill any stale Gradle daemons
  echo "🛑 Killing any stale Gradle daemon processes..."
  pkill -9 -f '.*GradleDaemon.*' || true
  pkill -9 -f 'gradle' || true
  
  # Clean up Gradle cache directories that might have locks
  echo "🧹 Cleaning Gradle cache directories..."
  rm -rf ~/.gradle/caches/journal-1/*.lock || true
  rm -rf ~/.gradle/caches/*.lock || true
  rm -rf ~/.gradle/daemon || true
  rm -rf /root/.gradle/caches/journal-1/*.lock || true
  rm -rf /root/.gradle/caches/*.lock || true
  rm -rf /root/.gradle/daemon || true
  
  # Set environment variables for Gradle
  export GRADLE_OPTS="-Dorg.gradle.daemon=false -Dorg.gradle.parallel=false -Dorg.gradle.jvmargs=-Xmx4096m"
  
  echo "✅ Gradle environment cleaned and configured for CI"
else
  echo "ℹ️ Not in CI environment, skipping cleanup"
fi

echo "=============================="
echo "✅ Pre-install hook complete"
