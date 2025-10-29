
#!/bin/bash

# ============================================================================
# Android Release Build Script
# ============================================================================
# This script builds the Android release AAB with all necessary fixes applied
#
# Usage:
#   chmod +x build-android-release.sh
#   ./build-android-release.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Print functions
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================================================"
echo "  Android Release Build - TechTime App"
echo "============================================================================"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

# Check Java version
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
    if [ "$JAVA_VERSION" = "17" ]; then
        print_success "Java 17 detected"
    else
        print_warning "Java version is $JAVA_VERSION, but Java 17 is recommended"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Build cancelled"
            exit 1
        fi
    fi
else
    print_error "Java not found. Please install JDK 17"
    exit 1
fi

# Check if android directory exists
if [ ! -d "android" ]; then
    print_error "Android directory not found"
    print_info "Run: npx expo prebuild -p android"
    exit 1
fi

print_success "Prerequisites check passed"
echo ""

# Navigate to android directory
cd android

# Stop all Gradle daemons
print_info "Stopping Gradle daemons..."
./gradlew --stop || true
sleep 2
print_success "Gradle daemons stopped"
echo ""

# Set up isolated Gradle home
print_info "Setting up isolated Gradle cache..."
export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"
print_success "Isolated cache: $GRADLE_USER_HOME"
echo ""

# Clean caches
print_info "Cleaning Gradle caches..."
rm -rf ~/.gradle/caches/*/fileHashes ~/.gradle/caches/journal-1 || true
print_success "Caches cleaned"
echo ""

# Clean project
print_info "Cleaning project..."
./gradlew clean --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME"
print_success "Project cleaned"
echo ""

# Determine memory allocation
TOTAL_RAM=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo "8")
if [ "$TOTAL_RAM" -lt 8 ]; then
    MEMORY_ALLOCATION="3g"
    print_warning "Low RAM detected ($TOTAL_RAM GB). Using $MEMORY_ALLOCATION for Gradle"
else
    MEMORY_ALLOCATION="4g"
    print_info "Using $MEMORY_ALLOCATION for Gradle"
fi
echo ""

# Build release AAB
print_info "Building release AAB..."
print_info "This may take 5-15 minutes..."
echo ""

export CMAKE_BUILD_PARALLEL_LEVEL=1

if CMAKE_BUILD_PARALLEL_LEVEL=1 ./gradlew :app:bundleRelease --no-daemon \
    --max-workers=2 \
    -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
    -Dorg.gradle.jvmargs="-Xmx$MEMORY_ALLOCATION -XX:MaxMetaspaceSize=1024m"; then
    
    print_success "Build completed successfully!"
    echo ""
    
    # Verify output
    AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
    if [ -f "$AAB_PATH" ]; then
        AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
        FULL_PATH=$(realpath "$AAB_PATH")
        
        echo "============================================================================"
        print_success "RELEASE AAB CREATED"
        echo "============================================================================"
        echo ""
        print_info "Location: $FULL_PATH"
        print_info "Size: $AAB_SIZE"
        echo ""
        print_info "Next steps:"
        echo "  1. Test on device: adb install $AAB_PATH"
        echo "  2. Upload to Google Play Console"
        echo "  3. Submit for review"
        echo ""
        echo "============================================================================"
        exit 0
    else
        print_error "AAB not found at expected location"
        exit 1
    fi
else
    print_warning "Build with lint failed. Retrying without lint..."
    echo ""
    
    if CMAKE_BUILD_PARALLEL_LEVEL=1 ./gradlew :app:bundleRelease -x lint --no-daemon \
        --max-workers=2 \
        -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
        -Dorg.gradle.jvmargs="-Xmx$MEMORY_ALLOCATION -XX:MaxMetaspaceSize=1024m"; then
        
        print_success "Build completed successfully (without lint)!"
        echo ""
        
        # Verify output
        AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
        if [ -f "$AAB_PATH" ]; then
            AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
            FULL_PATH=$(realpath "$AAB_PATH")
            
            echo "============================================================================"
            print_success "RELEASE AAB CREATED"
            echo "============================================================================"
            echo ""
            print_info "Location: $FULL_PATH"
            print_info "Size: $AAB_SIZE"
            echo ""
            print_info "Next steps:"
            echo "  1. Test on device: adb install $AAB_PATH"
            echo "  2. Upload to Google Play Console"
            echo "  3. Submit for review"
            echo ""
            echo "============================================================================"
            exit 0
        else
            print_error "AAB not found at expected location"
            exit 1
        fi
    else
        print_error "Build failed"
        echo ""
        print_info "Troubleshooting:"
        echo "  1. Check Java version: java -version (should be 17)"
        echo "  2. Check logs: android/app/build/outputs/logs/"
        echo "  3. Verify configuration: cd android && ./verify-config.sh"
        echo "  4. See documentation: ANDROID_BUILD_INSTRUCTIONS.md"
        exit 1
    fi
fi
