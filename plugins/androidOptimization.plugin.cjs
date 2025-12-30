
const { 
  withAppBuildGradle, 
  withProjectBuildGradle,
  withAndroidManifest 
} = require('@expo/config-plugins');

/**
 * Expo Config Plugin for Android Optimization
 * 
 * This plugin applies various Android-specific optimizations:
 * 1. Configures ProGuard for release builds
 * 2. Enables resource shrinking
 * 3. Optimizes build performance
 * 4. Configures proper Android manifest settings
 * 5. Sets up proper signing configurations
 */

/**
 * Configure app-level build.gradle for optimization
 */
const withAndroidAppOptimization = (config) => {
  return withAppBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;
      let modified = false;

      // 1. Ensure proper Android configuration block exists
      const androidBlockRegex = /android\s*\{/;
      if (!androidBlockRegex.test(buildGradle)) {
        console.warn('⚠️ No android block found in app/build.gradle');
        return config;
      }

      // 2. Configure buildTypes for optimization
      const buildTypesRegex = /buildTypes\s*\{/;
      if (buildTypesRegex.test(buildGradle)) {
        // Check if release block exists
        const releaseBlockRegex = /release\s*\{/;
        if (releaseBlockRegex.test(buildGradle)) {
          // Ensure minifyEnabled and shrinkResources are set
          if (!buildGradle.includes('minifyEnabled true')) {
            buildGradle = buildGradle.replace(
              /release\s*\{/,
              `release {
            minifyEnabled true
            shrinkResources true`
            );
            modified = true;
          }
        }
      }

      // 3. Configure packaging options to avoid conflicts
      const packagingOptionsBlock = `
    packagingOptions {
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
        exclude 'META-INF/DEPENDENCIES'
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/LICENSE.txt'
        exclude 'META-INF/license.txt'
        exclude 'META-INF/NOTICE'
        exclude 'META-INF/NOTICE.txt'
        exclude 'META-INF/notice.txt'
        exclude 'META-INF/ASL2.0'
        exclude 'META-INF/*.kotlin_module'
    }
`;

      if (!buildGradle.includes('packagingOptions')) {
        // Add packagingOptions inside android block
        buildGradle = buildGradle.replace(
          androidBlockRegex,
          `android {${packagingOptionsBlock}`
        );
        modified = true;
        console.log('✅ Added packagingOptions to app/build.gradle');
      }

      // 4. Configure compileOptions for Java 17
      if (!buildGradle.includes('compileOptions')) {
        const compileOptionsBlock = `
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
`;
        buildGradle = buildGradle.replace(
          androidBlockRegex,
          `android {${compileOptionsBlock}`
        );
        modified = true;
        console.log('✅ Added compileOptions to app/build.gradle');
      }

      // 5. Configure kotlinOptions for JVM target
      if (!buildGradle.includes('kotlinOptions')) {
        const kotlinOptionsBlock = `
    kotlinOptions {
        jvmTarget = '17'
    }
`;
        buildGradle = buildGradle.replace(
          androidBlockRegex,
          `android {${kotlinOptionsBlock}`
        );
        modified = true;
        console.log('✅ Added kotlinOptions to app/build.gradle');
      }

      if (modified) {
        config.modResults.contents = buildGradle;
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring Android app optimization:', error.message);
      return config;
    }
  });
};

/**
 * Configure project-level build.gradle
 */
const withAndroidProjectOptimization = (config) => {
  return withProjectBuildGradle(config, (config) => {
    try {
      let buildGradle = config.modResults.contents;
      let modified = false;

      // Ensure proper repository configuration
      const allprojectsRegex = /allprojects\s*\{[\s\S]*?repositories\s*\{/;
      if (allprojectsRegex.test(buildGradle)) {
        // Check if google() and mavenCentral() are present
        if (!buildGradle.includes('google()')) {
          buildGradle = buildGradle.replace(
            /repositories\s*\{/,
            `repositories {
        google()
        mavenCentral()`
          );
          modified = true;
        }
      }

      if (modified) {
        config.modResults.contents = buildGradle;
        console.log('✅ Optimized project-level build.gradle');
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring Android project optimization:', error.message);
      return config;
    }
  });
};

/**
 * Configure AndroidManifest.xml for optimization
 */
const withAndroidManifestOptimization = (config) => {
  return withAndroidManifest(config, (config) => {
    try {
      const manifest = config.modResults;
      const mainApplication = manifest.manifest.application?.[0];

      if (mainApplication) {
        // Set hardware acceleration
        if (!mainApplication.$?.['android:hardwareAccelerated']) {
          mainApplication.$['android:hardwareAccelerated'] = 'true';
        }

        // Set large heap for better performance
        if (!mainApplication.$?.['android:largeHeap']) {
          mainApplication.$['android:largeHeap'] = 'true';
        }

        // Disable backup (as specified in app.json)
        if (!mainApplication.$?.['android:allowBackup']) {
          mainApplication.$['android:allowBackup'] = 'false';
        }

        // Enable clear text traffic for development
        if (!mainApplication.$?.['android:usesCleartextTraffic']) {
          mainApplication.$['android:usesCleartextTraffic'] = 'true';
        }

        console.log('✅ Optimized AndroidManifest.xml');
      }

      return config;
    } catch (error) {
      console.error('⚠️ Error configuring AndroidManifest optimization:', error.message);
      return config;
    }
  });
};

/**
 * Main plugin function
 */
const withAndroidOptimization = (config) => {
  // Apply app-level optimizations
  config = withAndroidAppOptimization(config);
  
  // Apply project-level optimizations
  config = withAndroidProjectOptimization(config);
  
  // Apply manifest optimizations
  config = withAndroidManifestOptimization(config);

  return config;
};

module.exports = withAndroidOptimization;
