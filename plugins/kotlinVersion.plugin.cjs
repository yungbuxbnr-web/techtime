
const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to set Kotlin version to 2.0.21
 * 
 * This plugin ensures the correct Kotlin version is used to be compatible with KSP.
 * 
 * Supported Kotlin versions: 2.2.20, 2.2.10, 2.2.0, 2.1.21, 2.1.20, 2.1.10, 2.1.0, 2.0.21, 2.0.20, 2.0.10, 2.0.0
 */

const KOTLIN_VERSION = '2.0.21';

/**
 * Add kotlinVersion to gradle.properties
 */
const withKotlinGradleProperties = (config) => {
  return withGradleProperties(config, (config) => {
    try {
      const properties = config.modResults;
      
      // Remove any existing kotlinVersion or kotlin.version properties
      const existingIndices = [];
      properties.forEach((prop, index) => {
        if (prop.type === 'property' && (prop.key === 'kotlinVersion' || prop.key === 'kotlin.version')) {
          existingIndices.push(index);
        }
      });
      
      // Remove in reverse order to maintain indices
      existingIndices.reverse().forEach(index => {
        properties.splice(index, 1);
      });
      
      // Add both kotlinVersion and kotlin.version for maximum compatibility
      properties.push({
        type: 'property',
        key: 'kotlinVersion',
        value: KOTLIN_VERSION,
      });
      
      properties.push({
        type: 'property',
        key: 'kotlin.version',
        value: KOTLIN_VERSION,
      });
      
      return config;
    } catch (error) {
      console.error('⚠️ Error configuring Kotlin version in gradle.properties:', error.message);
      return config;
    }
  });
};

/**
 * Modify project-level build.gradle to use Kotlin version
 */
const withKotlinBuildGradle = (config) => {
  return withProjectBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;
      let modified = false;

      // Ensure buildscript block exists
      if (!buildGradle.includes('buildscript {')) {
        console.warn('⚠️ No buildscript block found in build.gradle');
        return config;
      }

      // Step 1: Ensure ext block exists with kotlinVersion
      const extBlockRegex = /buildscript\s*\{[\s\S]*?ext\s*\{/;
      const kotlinVersionInExtRegex = /ext\s*\{[\s\S]*?kotlinVersion\s*=/;
      
      if (extBlockRegex.test(buildGradle)) {
        // ext block exists
        if (kotlinVersionInExtRegex.test(buildGradle)) {
          // kotlinVersion exists in ext, update it
          buildGradle = buildGradle.replace(
            /kotlinVersion\s*=\s*["'][^"']*["']/,
            `kotlinVersion = "${KOTLIN_VERSION}"`
          );
          modified = true;
        } else {
          // ext exists but no kotlinVersion, add it
          buildGradle = buildGradle.replace(
            /ext\s*\{/,
            `ext {\n        kotlinVersion = "${KOTLIN_VERSION}"`
          );
          modified = true;
        }
      } else {
        // No ext block, create one
        buildGradle = buildGradle.replace(
          /buildscript\s*\{/,
          `buildscript {\n    ext {\n        kotlinVersion = "${KOTLIN_VERSION}"\n    }`
        );
        modified = true;
      }

      // Step 2: Update kotlin-gradle-plugin classpath to use $kotlinVersion
      const kotlinPluginRegex = /classpath\s*[(\[]\s*["']org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^"'\])]+["']\s*[)\]]/g;
      
      if (kotlinPluginRegex.test(buildGradle)) {
        buildGradle = buildGradle.replace(
          kotlinPluginRegex,
          'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
        );
        modified = true;
      }

      if (modified) {
        config.modResults.contents = buildGradle;
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring Kotlin version in build.gradle:', error.message);
      return config;
    }
  });
};

/**
 * Main plugin function - wrapped in try-catch for safety
 */
const withKotlinVersion = (config) => {
  try {
    config = withKotlinGradleProperties(config);
    config = withKotlinBuildGradle(config);
    return config;
  } catch (error) {
    console.error('⚠️ Critical error in Kotlin version plugin:', error.message);
    return config;
  }
};

module.exports = withKotlinVersion;
