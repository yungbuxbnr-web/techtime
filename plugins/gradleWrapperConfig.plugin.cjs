
const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Plugin to configure Gradle properties with network retry settings
 * This plugin only modifies gradle.properties and does NOT touch gradle-wrapper.properties
 * The gradle-wrapper.properties is handled by the fix-gradle-wrapper.js script after prebuild
 */
const withGradleWrapperConfig = (config) => {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults || [];
    
    // Network timeout settings for better reliability
    const networkSettings = [
      { type: 'property', key: 'systemProp.org.gradle.internal.http.connectionTimeout', value: '120000' },
      { type: 'property', key: 'systemProp.org.gradle.internal.http.socketTimeout', value: '120000' },
      { type: 'property', key: 'systemProp.http.socketTimeout', value: '120000' },
      { type: 'property', key: 'systemProp.http.connectionTimeout', value: '120000' },
    ];

    // Memory settings for Gradle daemon
    const memorySettings = [
      { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError' },
      { type: 'property', key: 'org.gradle.daemon', value: 'true' },
      { type: 'property', key: 'org.gradle.parallel', value: 'true' },
      { type: 'property', key: 'org.gradle.configureondemand', value: 'true' },
      { type: 'property', key: 'org.gradle.caching', value: 'true' },
    ];

    const allSettings = [...networkSettings, ...memorySettings];

    // Remove existing settings to avoid duplicates
    config.modResults = config.modResults.filter(
      item => !allSettings.some(setting => setting.key === item.key)
    );

    // Add all settings
    config.modResults.push(...allSettings);

    return config;
  });
};

module.exports = withGradleWrapperConfig;
