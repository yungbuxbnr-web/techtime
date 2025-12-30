
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to set Kotlin version to 2.0.21
 * 
 * This plugin ensures the correct Kotlin version is used to be compatible with KSP.
 * 
 * Error fixed:
 * Can't find KSP version for Kotlin version '1.9.24'. 
 * You're probably using an unsupported version of Kotlin.
 */

const withKotlinVersion = (config) => {
  return withProjectBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;

      // Check if kotlinVersion is already set
      const kotlinVersionRegex = /kotlinVersion\s*=\s*["'][^"']*["']/;
      
      if (kotlinVersionRegex.test(buildGradle)) {
        // Update existing kotlinVersion to 2.0.21
        buildGradle = buildGradle.replace(
          kotlinVersionRegex,
          'kotlinVersion = "2.0.21"'
        );
        console.log('✅ Updated Kotlin version to 2.0.21 in build.gradle');
      } else {
        // Add kotlinVersion in ext block
        const extBlockRegex = /buildscript\s*\{[\s\S]*?ext\s*\{/;
        if (extBlockRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            extBlockRegex,
            (match) => `${match}
        kotlinVersion = "2.0.21"`
          );
          console.log('✅ Added Kotlin version 2.0.21 to build.gradle');
        }
      }

      config.modResults.contents = buildGradle;
      return config;
    } catch (error) {
      console.error('⚠️ Error configuring Kotlin version:', error.message);
      return config;
    }
  });
};

module.exports = withKotlinVersion;
