
#!/bin/bash

# ============================================================================
# Android Release Build Script - Gradle Lock Error Fix
# ============================================================================
# This script automates the process of building a release AAB with all
# necessary fixes for Gradle lock errors and memory issues.
#
# Usage:
#   chmod +x build-release.sh
#   ./build-release.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Java version
    if command -v java &> /dev/null; then
        JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
        if [ "$JAVA_VERSION" -eq 17 ]; then
            print_success "Java 17 detected"
        else
            print_warning "Java version is $JAVA_VERSION, but Java 17 is recommended"
        fi
    else
        print_error "Java not found. Please install JDK 17"
        exit 1
    fi
    
    # Check if android directory exists
    if [ ! -d "android" ]; then
        print_error "Android directory not found. Run 'npx expo prebuild -p android' first"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to stop all Gradle daemons
stop_gradle_daemons() {
    print_info "Stopping all Gradle daemons..."
    
    cd android
    
    ./gradlew --stop || true
    pkill -f 'GradleDaemon' || true
    pkill -f 'org.gradle.launcher.daemon' || true
    
    sleep 2
    
    # Remove lock files
    rm -f ~/.gradle/caches/journal-1/journal-1.lock
    
    print_success "Gradle daemons stopped and locks cleared"
}

# Function to set up isolated Gradle cache
setup_isolated_cache() {
    print_info "Setting up isolated Gradle cache..."
    
    export GRADLE_USER_HOME="$PWD/.gradle-user-home-$(date +%s)"
    
    print_success "Isolated cache configured: $GRADLE_USER_HOME"
}

# Function to clean Gradle state
clean_gradle_state() {
    print_info "Cleaning Gradle state..."
    
    rm -rf ~/.gradle/caches/*/fileHashes ~/.gradle/caches/journal-1 || true
    
    ./gradlew clean --no-daemon -Dorg.gradle.user.home="$GRADLE_USER_HOME"
    
    print_success "Gradle state cleaned"
}

# Function to build release AAB
build_release_aab() {
    print_info "Building release AAB..."
    
    # Determine memory allocation based on available RAM
    TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_RAM" -lt 8 ]; then
        MEMORY_ALLOCATION="3g"
        print_warning "Low RAM detected ($TOTAL_RAM GB). Using $MEMORY_ALLOCATION for Gradle"
    else
        MEMORY_ALLOCATION="4g"
        print_info "Using $MEMORY_ALLOCATION for Gradle"
    fi
    
    # Try building with lint first
    if ./gradlew :app:bundleRelease --no-daemon \
        -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
        -Dorg.gradle.jvmargs="-Xmx$MEMORY_ALLOCATION -XX:MaxMetaspaceSize=1024m" \
        --max-workers=2; then
        print_success "Release AAB built successfully"
        return 0
    else
        print_warning "Build with lint failed. Retrying without lint..."
        
        # Try without lint
        if ./gradlew :app:bundleRelease -x lint --no-daemon \
            -Dorg.gradle.user.home="$GRADLE_USER_HOME" \
            -Dorg.gradle.jvmargs="-Xmx$MEMORY_ALLOCATION -XX:MaxMetaspaceSize=1024m" \
            --max-workers=2; then
            print_success "Release AAB built successfully (without lint)"
            return 0
        else
            print_error "Build failed. Check the error messages above"
            return 1
        fi
    fi
}

# Function to verify build output
verify_build() {
    print_info "Verifying build output..."
    
    AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
    
    if [ -f "$AAB_PATH" ]; then
        AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
        print_success "AAB found: $AAB_PATH ($AAB_SIZE)"
        
        # Show full path
        FULL_PATH=$(realpath "$AAB_PATH")
        print_info "Full path: $FULL_PATH"
        
        return 0
    else
        print_error "AAB not found at expected location: $AAB_PATH"
        return 1
    fi
}

# Function to show build summary
show_summary() {
    echo ""
    echo "============================================================================"
    print_success "BUILD COMPLETED SUCCESSFULLY"
    echo "============================================================================"
    echo ""
    print_info "Output location:"
    echo "  AAB: android/app/build/outputs/bundle/release/app-release.aab"
    echo ""
    print_info "Next steps:"
    echo "  1. Test the AAB on a device"
    echo "  2. Upload to Google Play Console"
    echo "  3. Submit for review"
    echo ""
    echo "============================================================================"
}

# Main execution
main() {
    echo "============================================================================"
    echo "  Android Release Build - Gradle Lock Error Fix"
    echo "============================================================================"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Stop Gradle daemons
    stop_gradle_daemons
    
    # Set up isolated cache
    setup_isolated_cache
    
    # Clean Gradle state
    clean_gradle_state
    
    # Build release AAB
    if build_release_aab; then
        # Verify build
        if verify_build; then
            show_summary
            exit 0
        else
            print_error "Build verification failed"
            exit 1
        fi
    else
        print_error "Build failed"
        exit 1
    fi
}

# Run main function
main
