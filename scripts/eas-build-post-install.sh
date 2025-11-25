
#!/usr/bin/env bash

# EAS Build Post-Install Hook
# This script runs after dependencies are installed but before the build
# It ensures Gradle is properly configured and cleaned

set -e

echo "🚀 EAS Build Post-Install Hook"
echo "=============================="

# Ensure NODE_ENV is set
if [ -z "$NODE_ENV" ]; then
  if [ "$EAS_BUILD" = "true" ] || [ "$CI" = "true" ]; then
    export NODE_ENV=production
  else
    export NODE_ENV=development
  fi
  echo "✅ Set NODE_ENV=$NODE_ENV"
fi

# Detect if we're in a CI/EAS environment
if [ "$EAS_BUILD" = "true" ] || [ "$CI" = "true" ]; then
  echo "✅ Running in CI/EAS Build environment"
  
  # Run the fix-gradle-wrapper script
  echo "🔧 Configuring Gradle wrapper..."
  node scripts/fix-gradle-wrapper.cjs || echo "⚠️ fix-gradle-wrapper.cjs not found or failed"
  
  # Ensure android directory exists
  if [ -d "android" ]; then
    cd android
    
    # Stop any Gradle daemons
    echo "🛑 Stopping Gradle daemons..."
    ./gradlew --stop || true
    
    # Clean the project with --no-daemon flag
    echo "🧹 Cleaning Gradle build..."
    ./gradlew clean --no-daemon --no-parallel --no-configure-on-demand || true
    
    cd ..
    
    echo "✅ Gradle cleaned and ready for build"
  else
    echo "⚠️ Android directory not found, skipping Gradle operations"
  fi
else
  echo "ℹ️ Not in CI environment, skipping Gradle cleanup"
fi

echo "=============================="
echo "✅ Post-install hook complete"
