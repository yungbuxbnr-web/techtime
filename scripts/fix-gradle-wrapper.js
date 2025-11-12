
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Fix Gradle wrapper to use stable version 8.10.2
 * This prevents "Connection reset" errors when downloading Gradle
 */
function fixGradleWrapper() {
  const androidPath = join(projectRoot, 'android');
  const wrapperDir = join(androidPath, 'gradle', 'wrapper');
  const wrapperPropertiesPath = join(wrapperDir, 'gradle-wrapper.properties');

  if (!existsSync(androidPath)) {
    console.log('⚠️  Android folder not found. Run "npx expo prebuild" first.');
    return;
  }

  if (!existsSync(wrapperDir)) {
    console.log('Creating gradle wrapper directory...');
    mkdirSync(wrapperDir, { recursive: true });
  }

  if (!existsSync(wrapperPropertiesPath)) {
    console.log('Creating gradle-wrapper.properties...');
    const defaultContent = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip
networkTimeout=120000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`;
    writeFileSync(wrapperPropertiesPath, defaultContent, 'utf8');
    console.log('✅ Created gradle-wrapper.properties with Gradle 8.10.2');
    return;
  }

  let content = readFileSync(wrapperPropertiesPath, 'utf8');
  const originalContent = content;

  // Replace Gradle version with stable 8.10.2
  content = content.replace(
    /distributionUrl=.*gradle-.*-bin\.zip/,
    'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip'
  );

  // Add network timeout if not present
  if (!content.includes('networkTimeout')) {
    content += '\nnetworkTimeout=120000';
  }

  // Add distribution URL validation if not present
  if (!content.includes('validateDistributionUrl')) {
    content += '\nvalidateDistributionUrl=true';
  }

  if (content !== originalContent) {
    writeFileSync(wrapperPropertiesPath, content, 'utf8');
    console.log('✅ Fixed gradle-wrapper.properties to use Gradle 8.10.2 with network retry');
  } else {
    console.log('✅ Gradle wrapper already configured correctly');
  }

  // Also update gradle.properties with network settings
  const gradlePropertiesPath = join(androidPath, 'gradle.properties');
  if (existsSync(gradlePropertiesPath)) {
    let gradleProps = readFileSync(gradlePropertiesPath, 'utf8');
    const originalProps = gradleProps;

    const networkSettings = [
      'systemProp.org.gradle.internal.http.connectionTimeout=120000',
      'systemProp.org.gradle.internal.http.socketTimeout=120000',
      'systemProp.http.socketTimeout=120000',
      'systemProp.http.connectionTimeout=120000'
    ];

    networkSettings.forEach(setting => {
      const key = setting.split('=')[0];
      if (!gradleProps.includes(key)) {
        gradleProps += '\n' + setting;
      }
    });

    if (gradleProps !== originalProps) {
      writeFileSync(gradlePropertiesPath, gradleProps, 'utf8');
      console.log('✅ Added network retry settings to gradle.properties');
    }
  }
}

try {
  fixGradleWrapper();
} catch (error) {
  console.error('❌ Error fixing Gradle wrapper:', error.message);
  process.exit(1);
}
