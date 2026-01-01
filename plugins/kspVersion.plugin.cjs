
const { withProjectBuildGradle, withSettingsGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to enforce KSP version 2.0.21-1.0.28
 * 
 * This plugin ensures the correct KSP version is used to match Kotlin 2.0.21
 * and prevents Gradle from pulling in incompatible versions.
 */

const KOTLIN_VERSION = '2.0.21';
const KSP_VERSION = '2.0.21-1.0.28';

/**
 * Modify project-level build.gradle to enforce KSP version
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

      // Add or update KSP plugin in dependencies
      const kspPluginRegex = /classpath\s*\(\s*["']com\.google\.devtools\.ksp:com\.google\.devtools\.ksp\.gradle\.plugin:[^"']+["']\s*\)/g;
      
      if (kspPluginRegex.test(buildGradle)) {
        // Update existing KSP plugin
        buildGradle = buildGradle.replace(
          kspPluginRegex,
          `classpath("com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:${KSP_VERSION}")`
        );
        modified = true;
        console.log(`✅ Updated KSP plugin to version ${KSP_VERSION}`);
      } else {
        // Add KSP plugin if not present
        const dependenciesRegex = /(buildscript\s*\{[\s\S]*?dependencies\s*\{)/;
        if (dependenciesRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            dependenciesRegex,
            `$1\n        classpath("com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:${KSP_VERSION}")`
          );
          modified = true;
          console.log(`✅ Added KSP plugin version ${KSP_VERSION}`);
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
 * Modify settings.gradle to enforce KSP version in plugin management
 */
const withKspSettingsGradle = (config) => {
  return withSettingsGradle(config, (config) => {
    try {
      let settingsGradle = config.modResults.contents;
      let modified = false;

      // Check if pluginManagement block exists
      const pluginManagementRegex = /pluginManagement\s*\{/;
      
      if (pluginManagementRegex.test(settingsGradle)) {
        // Check if resolutionStrategy exists
        const resolutionStrategyRegex = /pluginManagement\s*\{[\s\S]*?resolutionStrategy\s*\{/;
        
        if (resolutionStrategyRegex.test(settingsGradle)) {
          // Check if eachPlugin exists
          const eachPluginRegex = /resolutionStrategy\s*\{[\s\S]*?eachPlugin\s*\{/;
          
          if (eachPluginRegex.test(settingsGradle)) {
            // Add KSP version enforcement inside eachPlugin
            const kspEnforcementCode = `
                if (requested.id.id == "com.google.devtools.ksp") {
                    useVersion("${KSP_VERSION}")
                }`;
            
            if (!settingsGradle.includes('com.google.devtools.ksp')) {
              settingsGradle = settingsGradle.replace(
                /eachPlugin\s*\{/,
                `eachPlugin {${kspEnforcementCode}`
              );
              modified = true;
              console.log(`✅ Added KSP version enforcement in settings.gradle`);
            }
          } else {
            // Add eachPlugin block
            settingsGradle = settingsGradle.replace(
              /resolutionStrategy\s*\{/,
              `resolutionStrategy {
        eachPlugin {
            if (requested.id.id == "com.google.devtools.ksp") {
                useVersion("${KSP_VERSION}")
            }
        }`
            );
            modified = true;
            console.log(`✅ Added eachPlugin block with KSP version enforcement`);
          }
        }
      }

      if (modified) {
        config.modResults.contents = settingsGradle;
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring KSP version in settings.gradle:', error.message);
      return config;
    }
  });
};

/**
 * Main plugin function - wrapped in try-catch for safety
 */
const withKspVersion = (config) => {
  try {
    // Configure in build.gradle
    config = withKspProjectBuildGradle(config);
    
    // Configure in settings.gradle
    config = withKspSettingsGradle(config);

    return config;
  } catch (error) {
    console.error('⚠️ Critical error in KSP version plugin:', error.message);
    return config;
  }
};

module.exports = withKspVersion;
