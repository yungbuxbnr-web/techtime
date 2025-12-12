
const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin for C++ Build Configuration
 * 
 * This plugin fixes C++ build failures in react-native-gesture-handler and other
 * native modules by ensuring proper NDK version and CMake configuration for RN 0.81+
 * 
 * Fixes applied:
 * 1. Forces NDK version 26.1.10909125 in project build.gradle
 * 2. Adds CMake flags for C++17 with RTTI and exceptions in app build.gradle
 * 3. Patches CMakeLists.txt files to use C++17 standard
 * 
 * Error fixed:
 * "3 errors generated. ninja: build stopped: subcommand failed. C++ build system [build] failed"
 * in node_modules/react-native-gesture-handler/android/.cxx/
 */

/**
 * Patch CMakeLists.txt files to use C++17 standard
 * This function is called during prebuild to modify node_modules files
 */
function patchCMakeListsFiles(projectRoot) {
  const libraries = [
    'react-native-gesture-handler',
    'react-native-reanimated',
    'react-native-yoga',
  ];

  libraries.forEach(library => {
    const cmakeListsPath = path.join(
      projectRoot,
      'node_modules',
      library,
      'android',
      'CMakeLists.txt'
    );

    if (fs.existsSync(cmakeListsPath)) {
      try {
        let content = fs.readFileSync(cmakeListsPath, 'utf8');
        let modified = false;

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
          } else {
            // If no cmake_minimum_required, add at the top
            content = 'set(CMAKE_CXX_STANDARD 17)\n' + content;
            modified = true;
          }
        }

        // Add CMAKE_CXX_FLAGS if not present
        if (!content.includes('CMAKE_CXX_FLAGS') || !content.includes('-frtti -fexceptions')) {
          // Check if CMAKE_CXX_FLAGS exists
          if (content.includes('CMAKE_CXX_FLAGS')) {
            // Append to existing flags
            content = content.replace(
              /set\(CMAKE_CXX_FLAGS\s+"([^"]*)"\)/,
              'set(CMAKE_CXX_FLAGS "$1 -frtti -fexceptions")'
            );
          } else {
            // Add new CMAKE_CXX_FLAGS after CMAKE_CXX_STANDARD
            content = content.replace(
              /set\(CMAKE_CXX_STANDARD 17\)/,
              'set(CMAKE_CXX_STANDARD 17)\nset(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti -fexceptions")'
            );
          }
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(cmakeListsPath, content, 'utf8');
          console.log(`✅ Patched CMakeLists.txt for ${library}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not patch CMakeLists.txt for ${library}:`, error.message);
      }
    } else {
      console.warn(`⚠️ CMakeLists.txt not found for ${library}`);
    }
  });
}

/**
 * Add NDK version to project build.gradle
 */
const withNDKVersion = (config) => {
  return withProjectBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;

      // Check if ndkVersion is already set
      if (!buildGradle.includes('ndkVersion')) {
        // Find the buildscript block and add ndkVersion in ext
        const extBlockRegex = /buildscript\s*\{[\s\S]*?ext\s*\{/;
        if (extBlockRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            extBlockRegex,
            (match) => `${match}
        ndkVersion = "26.1.10909125"`
          );
          config.modResults.contents = buildGradle;
          console.log('✅ Added NDK version 26.1.10909125 to build.gradle');
        }
      } else if (!buildGradle.includes('26.1.10909125')) {
        // Update existing ndkVersion
        buildGradle = buildGradle.replace(
          /ndkVersion\s*=\s*["'][^"']*["']/,
          'ndkVersion = "26.1.10909125"'
        );
        config.modResults.contents = buildGradle;
        console.log('✅ Updated NDK version to 26.1.10909125 in build.gradle');
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring NDK version:', error.message);
      return config;
    }
  });
};

/**
 * Add CMake flags to app build.gradle
 */
const withCMakeFlags = (config) => {
  return withAppBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;

      // Check if externalNativeBuild with cmake already exists
      if (!buildGradle.includes('externalNativeBuild')) {
        // Add externalNativeBuild block in defaultConfig
        const defaultConfigRegex = /defaultConfig\s*\{/;
        if (defaultConfigRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            defaultConfigRegex,
            `defaultConfig {
        externalNativeBuild {
            cmake {
                cppFlags "-std=c++17 -frtti -fexceptions"
                arguments "-DANDROID_STL=c++_shared"
            }
        }`
          );
          config.modResults.contents = buildGradle;
          console.log('✅ Added CMake flags to app/build.gradle');
        }
      } else if (!buildGradle.includes('cppFlags') || !buildGradle.includes('-std=c++17')) {
        // Update existing externalNativeBuild
        const cmakeBlockRegex = /externalNativeBuild\s*\{[\s\S]*?cmake\s*\{/;
        if (cmakeBlockRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            cmakeBlockRegex,
            (match) => `${match}
                cppFlags "-std=c++17 -frtti -fexceptions"
                arguments "-DANDROID_STL=c++_shared"`
          );
          config.modResults.contents = buildGradle;
          console.log('✅ Updated CMake flags in app/build.gradle');
        }
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring CMake flags:', error.message);
      return config;
    }
  });
};

/**
 * Main plugin function
 */
const withCppBuildConfig = (config) => {
  // Apply NDK version
  config = withNDKVersion(config);
  
  // Apply CMake flags
  config = withCMakeFlags(config);

  // Patch CMakeLists.txt files if we're in the project root
  // This will run during prebuild
  try {
    const projectRoot = process.cwd();
    if (fs.existsSync(path.join(projectRoot, 'node_modules'))) {
      patchCMakeListsFiles(projectRoot);
    }
  } catch (error) {
    console.warn('⚠️ Could not patch CMakeLists.txt files:', error.message);
  }

  return config;
};

module.exports = withCppBuildConfig;
