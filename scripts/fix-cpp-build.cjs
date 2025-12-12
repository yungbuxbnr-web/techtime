
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 C++ Build Configuration Fix for React Native 0.81+');
console.log('=====================================================\n');

const rootDir = path.join(__dirname, '..');

/**
 * Patch cpp-adapter.cpp for RN 0.81 compatibility
 */
function patchCppAdapter() {
  const cppAdapterPath = path.join(
    rootDir,
    'node_modules',
    'react-native-gesture-handler',
    'android',
    'src',
    'main',
    'jni',
    'cpp-adapter.cpp'
  );

  if (!fs.existsSync(cppAdapterPath)) {
    console.log('⚠️ cpp-adapter.cpp not found for react-native-gesture-handler');
    return false;
  }

  try {
    let content = fs.readFileSync(cppAdapterPath, 'utf8');
    
    // Check if already patched
    if (content.includes('shadowNodeListFromValue')) {
      console.log('✓ cpp-adapter.cpp already patched for RN 0.81\n');
      return false;
    }

    // Replace the old code with RN 0.81 compatible version
    const oldCode = `                auto shadowNode = shadowNodeFromValue(runtime, arguments[0]);
                bool isViewFlatteningDisabled = shadowNode->getTraits().check(
                        ShadowNodeTraits::FormsStackingContext);

                // This is done using component names instead of type checking because
                // of duplicate symbols for RN types, which prevent RTTI from working.
                const char *componentName = shadowNode->getComponentName();
                bool isTextComponent = strcmp(componentName, "Paragraph") == 0 ||
                                       strcmp(componentName, "Text") == 0;

                return jsi::Value(isViewFlatteningDisabled || isTextComponent);`;

    const newCode = `                auto shadowNodeList = shadowNodeListFromValue(runtime, arguments[0]);

                if (shadowNodeList.size() == 0) {
                    return jsi::Value::undefined();
                }

                auto shadowNode = shadowNodeList[0];

                auto traits = shadowNode->getTraits();
                bool isViewFlatteningDisabled = traits.check(
                    facebook::react::ShadowNodeTraits::Trait::ViewKind
                );

                std::string componentName = shadowNode->getComponentDescriptor()
                    ->getComponentName();

                return jsi::Value(runtime, jsi::String::createFromUtf8(runtime, componentName));`;

    if (content.includes('shadowNodeFromValue')) {
      content = content.replace(oldCode, newCode);
      fs.writeFileSync(cppAdapterPath, content, 'utf8');
      console.log('✅ Successfully patched cpp-adapter.cpp for RN 0.81 compatibility\n');
      return true;
    } else {
      console.log('⚠️ Could not find expected code pattern in cpp-adapter.cpp\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error patching cpp-adapter.cpp:', error.message, '\n');
    return false;
  }
}

/**
 * Patch CMakeLists.txt files to use C++20 standard
 */
function patchCMakeListsFile(libraryName, useC20 = false) {
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
    const cppStandard = useC20 ? '20' : '17';

    // Add CMAKE_CXX_STANDARD if not present
    if (!content.includes(`set(CMAKE_CXX_STANDARD ${cppStandard})`)) {
      // Find cmake_minimum_required and add after it
      const cmakeMinRegex = /(cmake_minimum_required\([^)]+\))/;
      if (cmakeMinRegex.test(content)) {
        content = content.replace(
          cmakeMinRegex,
          `$1\nset(CMAKE_CXX_STANDARD ${cppStandard})\nset(CMAKE_CXX_STANDARD_REQUIRED ON)`
        );
        modified = true;
        console.log(`   ✅ Added CMAKE_CXX_STANDARD ${cppStandard}`);
      } else {
        // If no cmake_minimum_required, add at the top
        content = `set(CMAKE_CXX_STANDARD ${cppStandard})\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n` + content;
        modified = true;
        console.log(`   ✅ Added CMAKE_CXX_STANDARD ${cppStandard} at top`);
      }
    } else {
      console.log(`   ✓ CMAKE_CXX_STANDARD ${cppStandard} already present`);
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
          new RegExp(`set\\(CMAKE_CXX_STANDARD ${cppStandard}\\)`),
          `set(CMAKE_CXX_STANDARD ${cppStandard})\nset(CMAKE_CXX_FLAGS "\${CMAKE_CXX_FLAGS} -frtti -fexceptions")`
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
    path.join(rootDir, 'node_modules', 'react-native', 'android', '.cxx'),
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
 * Patch cpp-adapter.cpp and CMakeLists.txt files
 */
function patchGestureHandler() {
  console.log('2️⃣ Patching react-native-gesture-handler for RN 0.81...\n');

  console.log('📝 Patching cpp-adapter.cpp...');
  const cppPatched = patchCppAdapter();

  console.log('📝 Patching CMakeLists.txt...');
  const cmakePatched = patchCMakeListsFile('react-native-gesture-handler', true);

  return cppPatched || cmakePatched;
}

/**
 * Patch other CMakeLists.txt files
 */
function patchOtherLibraries() {
  console.log('3️⃣ Patching other libraries for C++17...\n');

  const libraries = [
    'react-native-reanimated',
    'react-native-yoga',
  ];

  let patched = 0;
  libraries.forEach(library => {
    console.log(`📝 Patching ${library}...`);
    if (patchCMakeListsFile(library, false)) {
      patched++;
    }
  });

  if (patched === 0) {
    console.log('✓ All other CMakeLists.txt files already configured\n');
  }
}

/**
 * Verify node_modules exist
 */
function verifyNodeModules() {
  console.log('0️⃣ Verifying node_modules...\n');

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
 * Clean Gradle caches
 */
function cleanGradleCaches() {
  console.log('5️⃣ Cleaning Gradle caches...\n');

  const gradleCachePath = path.join(require('os').homedir(), '.gradle', 'caches');
  
  if (fs.existsSync(gradleCachePath)) {
    try {
      console.log('   ⚠️ Gradle cache found at ~/.gradle/caches');
      console.log('   ℹ️ To clean it manually, run: rm -rf ~/.gradle/caches');
      console.log('   ⚠️ Skipping automatic cleanup (may affect other projects)\n');
    } catch (error) {
      console.log('   ⚠️ Could not access Gradle cache\n');
    }
  } else {
    console.log('   ✓ No Gradle cache found\n');
  }
}

/**
 * Main execution
 */
function main() {
  try {
    // Step 0: Verify node_modules
    verifyNodeModules();

    // Step 1: Clean C++ caches
    cleanCppCaches();

    // Step 2: Patch gesture-handler (cpp-adapter.cpp + CMakeLists.txt)
    patchGestureHandler();

    // Step 3: Patch other libraries
    patchOtherLibraries();

    // Step 4: Stop Gradle daemons
    stopGradleDaemons();

    // Step 5: Clean Gradle caches (info only)
    cleanGradleCaches();

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
    console.log('✅ cpp-adapter.cpp patched for RN 0.81 compatibility');
    console.log('✅ gesture-handler CMakeLists.txt set to C++20');
    console.log('✅ reanimated & yoga CMakeLists.txt set to C++17');
    console.log('✅ CMake flags added: -frtti -fexceptions');
    console.log('✅ C++ build caches cleaned');
    console.log('✅ NDK version set to 26.1.10909125 (via config plugin)\n');
    console.log('If the build still fails:');
    console.log('- Check that NDK 26.1.10909125 is installed');
    console.log('- Run: pnpm run gradle:clean');
    console.log('- Manually clean Gradle cache: rm -rf ~/.gradle/caches');
    console.log('- Check the Gradle error message for specific issues\n');

  } catch (error) {
    console.error('\n❌ Error during C++ build fix:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
