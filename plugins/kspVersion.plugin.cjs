
const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to enforce KSP version 2.0.21-1.0.28
 * 
 * This plugin ensures the correct KSP version is used to match Kotlin 2.0.21
 * and prevents Gradle from pulling in incompatible versions.
 */

const KSP_VERSION = '2.0.21-1.0.28';

/**
 * Add KSP version to gradle.properties
 */
const withKspGradleProperties = (config) => {
  return withGradleProperties(config, (config) => {
    try {
      const properties = config.modResults;
      
      // Remove any existing kspVersion property
      const existingIndices = [];
      properties.forEach((prop, index) => {
        if (prop.type === 'property' && prop.key === 'kspVersion') {
          existingIndices.push(index);
        }
      });
      
      // Remove in reverse order to maintain indices
      existingIndices.reverse().forEach(index => {
        properties.splice(index, 1);
      });
      
      // Add kspVersion
      properties.push({
        type: 'property',
        key: 'kspVersion',
        value: KSP_VERSION,
      });
      
      return config;
    } catch (error) {
      console.error('⚠️ Error configuring KSP version in gradle.properties:', error.message);
      return config;
    }
  });
};

/**
 * Modify project-level build.gradle to use KSP version
 */
const withKspProjectBuildGradle = (config) => {
  return withProjectBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;
      let modified = false;

      // Ensure buildscript block exists
      if (!buildGradle.includes('buildscript {')) {
        console.warn('⚠️ No buildscript block found in build.gradle');
        return config;
      }

      // Add or update KSP plugin in dependencies using the variable
      const kspPluginRegex = /classpath\s*[(\[]\s*["']com\.google\.devtools\.ksp:com\.google\.devtools\.ksp\.gradle\.plugin:[^"'\])]+["']\s*[)\]]/g;
      
      if (kspPluginRegex.test(buildGradle)) {
        // Update existing KSP plugin to use variable
        buildGradle = buildGradle.replace(
          kspPluginRegex,
          'classpath("com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:$kspVersion")'
        );
        modified = true;
      } else {
        // Add KSP plugin if not present
        const dependenciesRegex = /(buildscript\s*\{[\s\S]*?dependencies\s*\{)/;
        if (dependenciesRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            dependenciesRegex,
            `$1\n        classpath("com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:$kspVersion")`
          );
          modified = true;
        }
      }

      if (modified) {
        config.modResults.contents = buildGradle;
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring KSP version in build.gradle:', error.message);
      return config;
    }
  });
};

/**
 * Main plugin function - wrapped in try-catch for safety
 */
const withKspVersion = (config) => {
  try {
    config = withKspGradleProperties(config);
    config = withKspProjectBuildGradle(config);
    return config;
  } catch (error) {
    console.error('⚠️ Critical error in KSP version plugin:', error.message);
    return config;
  }
};

module.exports = withKspVersion;
