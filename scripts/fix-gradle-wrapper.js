
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Gradle wrapper configuration...');

const androidPath = path.join(__dirname, '..', 'android');
const wrapperPropertiesPath = path.join(androidPath, 'gradle', 'wrapper', 'gradle-wrapper.properties');

if (!fs.existsSync(androidPath)) {
  console.log('⚠️ Android folder not found. Run prebuild first.');
  process.exit(0);
}

if (!fs.existsSync(wrapperPropertiesPath)) {
  console.log('⚠️ Gradle wrapper properties file not found.');
  process.exit(0);
}

try {
  let wrapperContent = fs.readFileSync(wrapperPropertiesPath, 'utf8');
  
  // Replace Gradle version with 8.13 (minimum required version)
  const newContent = wrapperContent.replace(
    /distributionUrl=.*gradle-.*-bin\.zip/,
    'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.13-bin.zip'
  );

  if (newContent !== wrapperContent) {
    fs.writeFileSync(wrapperPropertiesPath, newContent, 'utf8');
    console.log('✅ Gradle wrapper configured to use version 8.13');
  } else {
    console.log('✅ Gradle wrapper already configured correctly');
  }

  // Also update gradle.properties if it exists
  const gradlePropertiesPath = path.join(androidPath, 'gradle.properties');
  if (fs.existsSync(gradlePropertiesPath)) {
    let gradleProps = fs.readFileSync(gradlePropertiesPath, 'utf8');
    
    // Ensure proper memory settings
    const memorySettings = [
      'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError',
      'org.gradle.daemon=true',
      'org.gradle.parallel=true',
      'org.gradle.configureondemand=true',
      'org.gradle.caching=true'
    ];

    let modified = false;
    for (const setting of memorySettings) {
      const [key] = setting.split('=');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (regex.test(gradleProps)) {
        gradleProps = gradleProps.replace(regex, setting);
        modified = true;
      } else {
        gradleProps += `\n${setting}`;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(gradlePropertiesPath, gradleProps, 'utf8');
      console.log('✅ Gradle properties updated with memory settings');
    }
  }

  console.log('✅ Gradle configuration complete');
} catch (error) {
  console.error('❌ Error fixing Gradle wrapper:', error.message);
  process.exit(1);
}
