
const { withGradleProperties, withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Plugin to configure Gradle wrapper with stable version and network retry settings
 */
const withGradleWrapperConfig = (config) => {
  // Configure gradle.properties with network settings
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults || [];
    
    // Add network timeout settings
    const networkSettings = [
      { type: 'property', key: 'systemProp.org.gradle.internal.http.connectionTimeout', value: '120000' },
      { type: 'property', key: 'systemProp.org.gradle.internal.http.socketTimeout', value: '120000' },
      { type: 'property', key: 'systemProp.http.socketTimeout', value: '120000' },
      { type: 'property', key: 'systemProp.http.connectionTimeout', value: '120000' },
    ];

    // Remove existing network settings to avoid duplicates
    config.modResults = config.modResults.filter(
      item => !networkSettings.some(setting => setting.key === item.key)
    );

    // Add network settings
    config.modResults.push(...networkSettings);

    return config;
  });

  // Configure gradle wrapper properties
  config = withProjectBuildGradle(config, async (config) => {
    const androidPath = path.join(config.modRequest.projectRoot, 'android');
    const wrapperPropertiesPath = path.join(androidPath, 'gradle', 'wrapper', 'gradle-wrapper.properties');

    // This will be applied after prebuild creates the android folder
    if (fs.existsSync(wrapperPropertiesPath)) {
      let wrapperContent = fs.readFileSync(wrapperPropertiesPath, 'utf8');
      
      // Replace Gradle version with stable 8.10.2
      wrapperContent = wrapperContent.replace(
        /distributionUrl=.*gradle-.*-bin\.zip/,
        'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip'
      );

      fs.writeFileSync(wrapperPropertiesPath, wrapperContent, 'utf8');
    }

    return config;
  });

  return config;
};

module.exports = withGradleWrapperConfig;
