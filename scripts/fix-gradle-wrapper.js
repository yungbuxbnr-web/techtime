
const fs = require('fs');
const path = require('path');

console.log('🔧 Running Gradle wrapper fix script...');

const androidPath = path.join(__dirname, '..', 'android');
const wrapperPropertiesPath = path.join(androidPath, 'gradle', 'wrapper', 'gradle-wrapper.properties');
const gradlePropertiesPath = path.join(androidPath, 'gradle.properties');

// Fix Gradle wrapper version
if (fs.existsSync(wrapperPropertiesPath)) {
  try {
    let wrapperContent = fs.readFileSync(wrapperPropertiesPath, 'utf8');
    
    // Replace Gradle version with 8.13
    wrapperContent = wrapperContent.replace(
      /distributionUrl=.*gradle-.*-bin\.zip/,
      'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.13-bin.zip'
    );

    fs.writeFileSync(wrapperPropertiesPath, wrapperContent, 'utf8');
    console.log('✅ Gradle wrapper configured to use version 8.13');
  } catch (error) {
    console.error('❌ Error fixing Gradle wrapper:', error.message);
  }
} else {
  console.log('⚠️ Gradle wrapper properties file not found. Run prebuild first.');
}

// Ensure gradle.properties has proper memory settings
if (fs.existsSync(gradlePropertiesPath)) {
  try {
    let gradleContent = fs.readFileSync(gradlePropertiesPath, 'utf8');
    
    // Check if memory settings are present
    if (!gradleContent.includes('org.gradle.jvmargs')) {
      console.log('📝 Adding memory settings to gradle.properties...');
      gradleContent += '\n# Memory settings for build stability\n';
      gradleContent += 'org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8 -XX:+HeapDumpOnOutOfMemoryError -XX:+UseParallelGC\n';
      gradleContent += 'org.gradle.daemon=true\n';
      gradleContent += 'org.gradle.parallel=true\n';
      gradleContent += 'org.gradle.configureondemand=true\n';
      gradleContent += 'org.gradle.workers.max=2\n';
      
      fs.writeFileSync(gradlePropertiesPath, gradleContent, 'utf8');
      console.log('✅ Memory settings added to gradle.properties');
    } else {
      console.log('✅ Memory settings already present in gradle.properties');
    }
  } catch (error) {
    console.error('❌ Error updating gradle.properties:', error.message);
  }
} else {
  console.log('⚠️ gradle.properties file not found. Run prebuild first.');
}

console.log('✅ Gradle wrapper fix script completed');
