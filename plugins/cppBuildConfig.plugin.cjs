
const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for C++ Build Configuration
 * 
 * This plugin ensures proper NDK version and CMake configuration for RN 0.81+
 * 
 * Fixes applied:
 * 1. Forces NDK version 26.1.10909125 in project build.gradle
 * 2. Adds CMake flags for C++17 with RTTI and exceptions in app build.gradle
 */

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

  return config;
};

module.exports = withCppBuildConfig;
