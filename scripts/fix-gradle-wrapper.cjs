
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing Gradle wrapper configuration...');

const androidPath = path.join(__dirname, '..', 'android');
const wrapperPropertiesPath = path.join(androidPath, 'gradle', 'wrapper', 'gradle-wrapper.properties');
const gradlePropertiesPath = path.join(androidPath, 'gradle.properties');

// Detect CI environment
const isCI = process.env.CI === 'true' || 
             process.env.EAS_BUILD === 'true' || 
             process.env.CONTINUOUS_INTEGRATION === 'true';

console.log(`📦 Environment: ${isCI ? 'CI/EAS Build' : 'Local Development'}`);

if (!fs.existsSync(androidPath)) {
  console.log('⚠️ Android folder not found. Run prebuild first.');
  process.exit(0);
}

try {
  // Stop all Gradle daemons to prevent lock conflicts
  console.log('🛑 Stopping all Gradle daemons...');
  try {
    execSync('cd android && ./gradlew --stop', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      timeout: 30000
    });
    console.log('✅ Gradle daemons stopped');
  } catch (error) {
    console.log('⚠️ Could not stop Gradle daemons (may not be running)');
  }

  // Clean Gradle cache in CI to prevent lock issues
  if (isCI) {
    console.log('🧹 Cleaning Gradle cache for CI build...');
    try {
      execSync('cd android && ./gradlew clean --no-daemon', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        timeout: 120000
      });
      console.log('✅ Gradle cache cleaned');
    } catch (error) {
      console.log('⚠️ Could not clean Gradle cache:', error.message);
    }
  }

  // Update gradle-wrapper.properties
  if (fs.existsSync(wrapperPropertiesPath)) {
    let wrapperContent = fs.readFileSync(wrapperPropertiesPath, 'utf8');
    
    // Use Gradle 8.14.3 for better compatibility with React Native 0.81.4
    const newContent = wrapperContent.replace(
      /distributionUrl=.*gradle-.*-bin\.zip/,
      'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-bin.zip'
    );

    if (newContent !== wrapperContent) {
      fs.writeFileSync(wrapperPropertiesPath, newContent, 'utf8');
      console.log('✅ Gradle wrapper configured to use version 8.14.3');
    } else {
      console.log('✅ Gradle wrapper already configured correctly');
    }
  }

  // Update gradle.properties with environment-specific settings
  if (fs.existsSync(gradlePropertiesPath)) {
    let gradleProps = fs.readFileSync(gradlePropertiesPath, 'utf8');
    
    // Define settings based on environment
    const memorySettings = [
      'org.gradle.jvmargs=-Xmx6144m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8 -XX:+UseG1GC',
    ];

    const ciSettings = isCI ? [
      'org.gradle.daemon=false',
      'org.gradle.parallel=false',
      'org.gradle.configureondemand=false',
      'org.gradle.caching=false',
      'org.gradle.vfs.watch=false',
    ] : [
      'org.gradle.daemon=true',
      'org.gradle.parallel=true',
      'org.gradle.configureondemand=true',
      'org.gradle.caching=true',
      'org.gradle.daemon.idletimeout=3600000',
    ];

    // Add React Native and Reanimated specific settings
    const rnSettings = [
      'android.useAndroidX=true',
      'android.enableJetifier=true',
      'hermesEnabled=true',
      'newArchEnabled=true',
    ];

    const allSettings = [...memorySettings, ...ciSettings, ...rnSettings];

    let modified = false;
    for (const setting of allSettings) {
      const [key] = setting.split('=');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (regex.test(gradleProps)) {
        const currentValue = gradleProps.match(regex)?.[0];
        if (currentValue !== setting) {
          gradleProps = gradleProps.replace(regex, setting);
          modified = true;
        }
      } else {
        gradleProps += `\n${setting}`;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(gradlePropertiesPath, gradleProps, 'utf8');
      console.log(`✅ Gradle properties updated for ${isCI ? 'CI' : 'local'} environment`);
    }
  }

  console.log('✅ Gradle configuration complete');
  
  if (isCI) {
    console.log('');
    console.log('🚀 CI Build Configuration:');
    console.log('   ✓ Daemons disabled');
    console.log('   ✓ Parallel builds disabled');
    console.log('   ✓ Cache locking prevention enabled');
    console.log('   ✓ Fresh Gradle state ensured');
  } else {
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm run gradle:stop');
    console.log('   2. Run: npm run gradle:clean');
    console.log('   3. Delete android and ios folders');
    console.log('   4. Run: npm run prebuild:android');
    console.log('   5. Run: npm run android');
  }
  
  console.log('');
  process.exit(0);
} catch (error) {
  console.error('❌ Error fixing Gradle wrapper:', error.message);
  process.exit(1);
}
