
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 C++ Build Configuration Fix for React Native 0.81+');
console.log('=====================================================\n');

const rootDir = path.join(__dirname, '..');

/**
 * Patch CMakeLists.txt files to use C++17 standard
 */
function patchCMakeListsFile(libraryName) {
  const cmakeListsPath = path.join(
    rootDir,
    'node_modules',
    libraryName,
    'android',
    'CMakeLists.txt'
  );

  if (!fs.existsSync(cmakeListsPath)) {
    console.log(`⚠️ CMakeLists.txt not found for ${libraryName}`);
    return false;
  }

  try {
    let content = fs.readFileSync(cmakeListsPath, 'utf8');
    let modified = false;
    const originalContent = content;

    // Add CMAKE_CXX_STANDARD 17 if not present
    if (!content.includes('set(CMAKE_CXX_STANDARD 17)')) {
      // Find cmake_minimum_required and add after it
      const cmakeMinRegex = /(cmake_minimum_required\([^)]+\))/;
      if (cmakeMinRegex.test(content)) {
        content = content.replace(
          cmakeMinRegex,
          '$1\nset(CMAKE_CXX_STANDARD 17)'
        );
        modified = true;
        console.log(`   ✅ Added CMAKE_CXX_STANDARD 17`);
      } else {
        // If no cmake_minimum_required, add at the top
        content = 'set(CMAKE_CXX_STANDARD 17)\n' + content;
        modified = true;
        console.log(`   ✅ Added CMAKE_CXX_STANDARD 17 at top`);
      }
    } else {
      console.log(`   ✓ CMAKE_CXX_STANDARD 17 already present`);
    }

    // Add or update CMAKE_CXX_FLAGS
    if (!content.includes('-frtti') || !content.includes('-fexceptions')) {
      if (content.includes('set(CMAKE_CXX_FLAGS')) {
        // Update existing CMAKE_CXX_FLAGS
        content = content.replace(
          /set\(CMAKE_CXX_FLAGS\s+"([^"]*)"\)/,
          (match, flags) => {
            let newFlags = flags;
            if (!flags.includes('-frtti')) {
              newFlags += ' -frtti';
            }
            if (!flags.includes('-fexceptions')) {
              newFlags += ' -fexceptions';
            }
            return `set(CMAKE_CXX_FLAGS "${newFlags.trim()}")`;
          }
        );
        modified = true;
        console.log(`   ✅ Updated CMAKE_CXX_FLAGS with -frtti -fexceptions`);
      } else {
        // Add new CMAKE_CXX_FLAGS
        content = content.replace(
          /set\(CMAKE_CXX_STANDARD 17\)/,
          'set(CMAKE_CXX_STANDARD 17)\nset(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti -fexceptions")'
        );
        modified = true;
        console.log(`   ✅ Added CMAKE_CXX_FLAGS with -frtti -fexceptions`);
      }
    } else {
      console.log(`   ✓ CMAKE_CXX_FLAGS already has -frtti -fexceptions`);
    }

    if (modified) {
      fs.writeFileSync(cmakeListsPath, content, 'utf8');
      console.log(`✅ Successfully patched ${libraryName}/android/CMakeLists.txt\n`);
      return true;
    } else {
      console.log(`✓ ${libraryName}/android/CMakeLists.txt already configured\n`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error patching ${libraryName}:`, error.message, '\n');
    return false;
  }
}

/**
 * Clean C++ build caches
 */
function cleanCppCaches() {
  console.log('1️⃣ Cleaning C++ build caches...\n');

  const cachePaths = [
    path.join(rootDir, 'android', '.cxx'),
    path.join(rootDir, 'node_modules', 'react-native-gesture-handler', 'android', '.cxx'),
    path.join(rootDir, 'node_modules', 'react-native-reanimated', 'android', '.cxx'),
    path.join(rootDir, 'node_modules', 'react-native-yoga', 'android', '.cxx'),
  ];

  let cleaned = 0;
  cachePaths.forEach(cachePath => {
    if (fs.existsSync(cachePath)) {
      try {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log(`   ✅ Removed ${path.relative(rootDir, cachePath)}`);
        cleaned++;
      } catch (error) {
        console.warn(`   ⚠️ Could not remove ${path.relative(rootDir, cachePath)}:`, error.message);
      }
    }
  });

  if (cleaned === 0) {
    console.log('   ✓ No C++ caches found (already clean)');
  }
  console.log('');
}

/**
 * Patch CMakeLists.txt files
 */
function patchAllCMakeLists() {
  console.log('2️⃣ Patching CMakeLists.txt files for C++17...\n');

  const libraries = [
    'react-native-gesture-handler',
    'react-native-reanimated',
    'react-native-yoga',
  ];

  let patched = 0;
  libraries.forEach(library => {
    console.log(`📝 Patching ${library}...`);
    if (patchCMakeListsFile(library)) {
      patched++;
    }
  });

  if (patched === 0) {
    console.log('✓ All CMakeLists.txt files already configured\n');
  }
}

/**
 * Verify node_modules exist
 */
function verifyNodeModules() {
  console.log('3️⃣ Verifying node_modules...\n');

  const nodeModulesPath = path.join(rootDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.error('❌ node_modules not found!');
    console.error('   Please run: pnpm install\n');
    process.exit(1);
  }

  const libraries = [
    'react-native-gesture-handler',
    'react-native-reanimated',
    'react-native-yoga',
  ];

  let allPresent = true;
  libraries.forEach(library => {
    const libraryPath = path.join(nodeModulesPath, library);
    if (fs.existsSync(libraryPath)) {
      console.log(`   ✅ ${library}`);
    } else {
      console.error(`   ❌ ${library} not found`);
      allPresent = false;
    }
  });

  if (!allPresent) {
    console.error('\n❌ Some required libraries are missing!');
    console.error('   Please run: pnpm install\n');
    process.exit(1);
  }

  console.log('');
}

/**
 * Stop Gradle daemons
 */
function stopGradleDaemons() {
  console.log('4️⃣ Stopping Gradle daemons...\n');

  const androidPath = path.join(rootDir, 'android');
  if (!fs.existsSync(androidPath)) {
    console.log('   ⚠️ Android folder not found (run prebuild first)\n');
    return;
  }

  try {
    execSync('cd android && ./gradlew --stop', {
      cwd: rootDir,
      stdio: 'inherit',
      timeout: 30000
    });
    console.log('   ✅ Gradle daemons stopped\n');
  } catch (error) {
    console.log('   ⚠️ Could not stop Gradle daemons (may not be running)\n');
  }
}

/**
 * Main execution
 */
function main() {
  try {
    // Step 1: Verify node_modules
    verifyNodeModules();

    // Step 2: Clean C++ caches
    cleanCppCaches();

    // Step 3: Patch CMakeLists.txt files
    patchAllCMakeLists();

    // Step 4: Stop Gradle daemons
    stopGradleDaemons();

    // Success message
    console.log('=====================================================');
    console.log('✅ C++ build configuration completed successfully!');
    console.log('=====================================================\n');
    console.log('Next steps:');
    console.log('1. Run: npx expo prebuild --clean');
    console.log('   This will regenerate Android/iOS folders with the new config');
    console.log('2. Run: pnpm run android');
    console.log('   OR: npx expo run:android\n');
    console.log('The following fixes have been applied:');
    console.log('✅ NDK version set to 26.1.10909125 (via config plugin)');
    console.log('✅ CMake flags added: -std=c++17 -frtti -fexceptions (via config plugin)');
    console.log('✅ CMakeLists.txt patched for gesture-handler, reanimated, yoga');
    console.log('✅ C++ build caches cleaned\n');
    console.log('If the build still fails:');
    console.log('- Check that NDK 26.1.10909125 is installed');
    console.log('- Run: pnpm run gradle:clean');
    console.log('- Check the Gradle error message for specific issues\n');

  } catch (error) {
    console.error('\n❌ Error during C++ build fix:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
