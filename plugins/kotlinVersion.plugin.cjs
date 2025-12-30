
const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to set Kotlin version to 2.0.21
 * 
 * This plugin ensures the correct Kotlin version is used to be compatible with KSP.
 * 
 * Error fixed:
 * Can't find KSP version for Kotlin version '1.9.24'. 
 * You're probably using an unsupported version of Kotlin.
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
      
      // Remove any existing kotlinVersion property
      const existingIndex = properties.findIndex(
        (prop) => prop.type === 'property' && prop.key === 'kotlinVersion'
      );
      
      if (existingIndex >= 0) {
        properties.splice(existingIndex, 1);
      }
      
      // Add kotlinVersion property
      properties.push({
        type: 'property',
        key: 'kotlinVersion',
        value: KOTLIN_VERSION,
      });
      
      console.log(`✅ Set kotlinVersion to ${KOTLIN_VERSION} in gradle.properties`);
      
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

      // Step 1: Ensure ext block exists with kotlinVersion
      const buildscriptRegex = /buildscript\s*\{/;
      const extBlockRegex = /buildscript\s*\{[\s\S]*?ext\s*\{/;
      const kotlinVersionInExtRegex = /ext\s*\{[\s\S]*?kotlinVersion\s*=/;
      
      if (!buildscriptRegex.test(buildGradle)) {
        console.warn('⚠️ No buildscript block found in build.gradle');
        return config;
      }

      if (extBlockRegex.test(buildGradle)) {
        // ext block exists
        if (kotlinVersionInExtRegex.test(buildGradle)) {
          // kotlinVersion exists in ext, update it
          buildGradle = buildGradle.replace(
            /kotlinVersion\s*=\s*["'][^"']*["']/,
            `kotlinVersion = "${KOTLIN_VERSION}"`
          );
          modified = true;
          console.log(`✅ Updated kotlinVersion to ${KOTLIN_VERSION} in ext block`);
        } else {
          // ext exists but no kotlinVersion, add it
          buildGradle = buildGradle.replace(
            /ext\s*\{/,
            `ext {\n    kotlinVersion = "${KOTLIN_VERSION}"`
          );
          modified = true;
          console.log(`✅ Added kotlinVersion ${KOTLIN_VERSION} to existing ext block`);
        }
      } else {
        // No ext block, create one
        buildGradle = buildGradle.replace(
          buildscriptRegex,
          `buildscript {\n  ext {\n    kotlinVersion = "${KOTLIN_VERSION}"\n  }`
        );
        modified = true;
        console.log(`✅ Created ext block with kotlinVersion ${KOTLIN_VERSION}`);
      }

      // Step 2: Update kotlin-gradle-plugin classpath to use $kotlinVersion
      const kotlinPluginRegexes = [
        // Match with explicit version
        /classpath\s*\(\s*["']org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^"']+["']\s*\)/g,
        // Match without version
        /classpath\s*\(\s*["']org\.jetbrains\.kotlin:kotlin-gradle-plugin["']\s*\)/g,
        // Match with single quotes
        /classpath\s*\(\s*'org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^']+'\s*\)/g,
        /classpath\s*\(\s*'org\.jetbrains\.kotlin:kotlin-gradle-plugin'\s*\)/g,
      ];

      let pluginUpdated = false;
      for (const regex of kotlinPluginRegexes) {
        if (regex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            regex,
            'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
          );
          pluginUpdated = true;
          modified = true;
        }
      }

      if (pluginUpdated) {
        console.log('✅ Updated kotlin-gradle-plugin to use $kotlinVersion variable');
      } else {
        console.warn('⚠️ Could not find kotlin-gradle-plugin classpath to update');
      }

      // Step 3: Ensure we're not using any hardcoded Kotlin versions elsewhere
      const hardcodedKotlinRegex = /["']1\.\d+\.\d+["']/g;
      const matches = buildGradle.match(hardcodedKotlinRegex);
      if (matches && matches.length > 0) {
        console.warn('⚠️ Found potential hardcoded Kotlin versions:', matches);
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
 * Main plugin function
 */
const withKotlinVersion = (config) => {
  // First set in gradle.properties
  config = withKotlinGradleProperties(config);
  
  // Then configure build.gradle
  config = withKotlinBuildGradle(config);

  return config;
};

module.exports = withKotlinVersion;
