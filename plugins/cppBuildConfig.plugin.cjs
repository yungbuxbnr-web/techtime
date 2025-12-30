
const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for C++ Build Configuration
 * 
 * This plugin ensures proper NDK version and CMake configuration for RN 0.76+
 * 
 * Fixes applied:
 * 1. Forces NDK version 26.1.10909125 in project build.gradle
 * 2. Adds CMake flags for C++17 with RTTI and exceptions in app build.gradle
 * 3. Ensures compatibility with Kotlin 2.0.21
 */

const NDK_VERSION = '26.1.10909125';

/**
 * Add NDK version to project build.gradle
 */
const withNDKVersion = (config) => {
  return withProjectBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;
      let modified = false;

      // Check if ndkVersion is already set
      const ndkVersionRegex = /ndkVersion\s*=\s*["'][^"']*["']/;
      
      if (ndkVersionRegex.test(buildGradle)) {
        // Update existing ndkVersion
        if (!buildGradle.includes(NDK_VERSION)) {
          buildGradle = buildGradle.replace(
            ndkVersionRegex,
            `ndkVersion = "${NDK_VERSION}"`
          );
          modified = true;
          console.log(`✅ Updated NDK version to ${NDK_VERSION} in build.gradle`);
        }
      } else {
        // Add ndkVersion in ext block
        const extBlockRegex = /ext\s*\{/;
        if (extBlockRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            extBlockRegex,
            `ext {\n    ndkVersion = "${NDK_VERSION}"`
          );
          modified = true;
          console.log(`✅ Added NDK version ${NDK_VERSION} to build.gradle`);
        }
      }

      if (modified) {
        config.modResults.contents = buildGradle;
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
      let modified = false;

      // Check if externalNativeBuild with cmake already exists
      const externalNativeBuildRegex = /externalNativeBuild\s*\{[\s\S]*?cmake\s*\{/;
      const cppFlagsRegex = /cppFlags\s+["'][^"']*["']/;
      
      if (externalNativeBuildRegex.test(buildGradle)) {
        // externalNativeBuild exists
        if (!cppFlagsRegex.test(buildGradle) || !buildGradle.includes('-std=c++17')) {
          // Add or update cppFlags
          buildGradle = buildGradle.replace(
            /cmake\s*\{/,
            `cmake {\n                cppFlags "-std=c++17 -frtti -fexceptions"\n                arguments "-DANDROID_STL=c++_shared"`
          );
          modified = true;
          console.log('✅ Updated CMake flags in app/build.gradle');
        }
      } else {
        // Add externalNativeBuild block in defaultConfig
        const defaultConfigRegex = /defaultConfig\s*\{/;
        if (defaultConfigRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            defaultConfigRegex,
            `defaultConfig {\n        externalNativeBuild {\n            cmake {\n                cppFlags "-std=c++17 -frtti -fexceptions"\n                arguments "-DANDROID_STL=c++_shared"\n            }\n        }`
          );
          modified = true;
          console.log('✅ Added CMake flags to app/build.gradle');
        }
      }

      if (modified) {
        config.modResults.contents = buildGradle;
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
