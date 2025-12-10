
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 React Native Reanimated Build Fix');
console.log('=====================================\n');

const rootDir = path.join(__dirname, '..');

// Step 1: Check Node version
console.log('1️⃣ Checking Node.js version...');
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18 || majorVersion >= 23) {
    console.error('❌ Node.js version must be between 18 and 22');
    console.error(`   Current version: ${nodeVersion}`);
    console.error('   Please install a compatible version using nvm:');
    console.error('   nvm install 18 && nvm use 18');
    process.exit(1);
  }
  
  console.log(`✅ Node.js version ${nodeVersion} is compatible\n`);
} catch (error) {
  console.error('❌ Could not check Node.js version:', error.message);
  process.exit(1);
}

// Step 2: Stop Gradle daemons
console.log('2️⃣ Stopping Gradle daemons...');
try {
  if (fs.existsSync(path.join(rootDir, 'android'))) {
    execSync('cd android && ./gradlew --stop', { 
      cwd: rootDir,
      stdio: 'inherit',
      timeout: 30000
    });
    console.log('✅ Gradle daemons stopped\n');
  } else {
    console.log('⚠️ Android folder not found, skipping\n');
  }
} catch (error) {
  console.log('⚠️ Could not stop Gradle daemons (may not be running)\n');
}

// Step 3: Clean Gradle cache
console.log('3️⃣ Cleaning Gradle cache...');
try {
  if (fs.existsSync(path.join(rootDir, 'android'))) {
    execSync('cd android && ./gradlew clean --no-daemon', { 
      cwd: rootDir,
      stdio: 'inherit',
      timeout: 120000
    });
    console.log('✅ Gradle cache cleaned\n');
  } else {
    console.log('⚠️ Android folder not found, skipping\n');
  }
} catch (error) {
  console.log('⚠️ Could not clean Gradle cache:', error.message, '\n');
}

// Step 4: Remove android and ios folders
console.log('4️⃣ Removing android and ios folders...');
try {
  const androidPath = path.join(rootDir, 'android');
  const iosPath = path.join(rootDir, 'ios');
  
  if (fs.existsSync(androidPath)) {
    fs.rmSync(androidPath, { recursive: true, force: true });
    console.log('✅ Removed android folder');
  }
  
  if (fs.existsSync(iosPath)) {
    fs.rmSync(iosPath, { recursive: true, force: true });
    console.log('✅ Removed ios folder');
  }
  
  console.log('');
} catch (error) {
  console.error('❌ Could not remove folders:', error.message);
  process.exit(1);
}

// Step 5: Prebuild Android
console.log('5️⃣ Running prebuild for Android...');
console.log('   This may take a few minutes...\n');
try {
  execSync('npm run prebuild:android', { 
    cwd: rootDir,
    stdio: 'inherit',
    timeout: 300000 // 5 minutes
  });
  console.log('\n✅ Prebuild completed successfully\n');
} catch (error) {
  console.error('❌ Prebuild failed:', error.message);
  console.error('\nTry running manually:');
  console.error('npm run prebuild:android');
  process.exit(1);
}

// Success message
console.log('=====================================');
console.log('✅ Build fix completed successfully!');
console.log('=====================================\n');
console.log('Next steps:');
console.log('1. Run: npm run android');
console.log('2. If the build still fails, check REANIMATED_BUILD_FIX.md\n');
