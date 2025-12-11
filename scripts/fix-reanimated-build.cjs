
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
    console.error('   nvm install 20 && nvm use 20');
    process.exit(1);
  }
  
  console.log(`✅ Node.js version ${nodeVersion} is compatible`);
  
  // Get Node path
  try {
    const nodePath = execSync('which node', { encoding: 'utf8' }).trim();
    console.log(`   Node.js path: ${nodePath}\n`);
  } catch (error) {
    console.log(`   Node.js path: ${process.execPath}\n`);
  }
} catch (error) {
  console.error('❌ Could not check Node.js version:', error.message);
  process.exit(1);
}

// Step 2: Verify react-native-reanimated package.json
console.log('2️⃣ Verifying react-native-reanimated installation...');
try {
  const reanimatedPackageJsonPath = path.join(rootDir, 'node_modules', 'react-native-reanimated', 'package.json');
  
  if (!fs.existsSync(reanimatedPackageJsonPath)) {
    console.log('⚠️ react-native-reanimated package.json not found');
    console.log('   Reinstalling dependencies...\n');
    
    execSync('pnpm install', {
      cwd: rootDir,
      stdio: 'inherit',
      timeout: 180000
    });
    
    console.log('✅ Dependencies reinstalled\n');
  } else {
    const packageJson = JSON.parse(fs.readFileSync(reanimatedPackageJsonPath, 'utf8'));
    console.log(`✅ react-native-reanimated ${packageJson.version} is installed\n`);
  }
} catch (error) {
  console.error('❌ Could not verify react-native-reanimated:', error.message);
  process.exit(1);
}

// Step 3: Verify babel.config.cjs has reanimated plugin
console.log('3️⃣ Verifying Babel configuration...');
try {
  const babelConfigPath = path.join(rootDir, 'babel.config.cjs');
  
  if (fs.existsSync(babelConfigPath)) {
    const babelConfig = fs.readFileSync(babelConfigPath, 'utf8');
    
    if (!babelConfig.includes('react-native-reanimated/plugin')) {
      console.error('❌ babel.config.cjs is missing react-native-reanimated/plugin');
      console.error('   Please add it as the LAST plugin in your babel.config.cjs');
      process.exit(1);
    }
    
    // Check if it's the last plugin
    const pluginsMatch = babelConfig.match(/plugins:\s*\[([\s\S]*?)\]/);
    if (pluginsMatch) {
      const pluginsContent = pluginsMatch[1];
      const lastPlugin = pluginsContent.trim().split(',').pop().trim();
      
      if (!lastPlugin.includes('react-native-reanimated/plugin')) {
        console.warn('⚠️ react-native-reanimated/plugin should be the LAST plugin');
        console.warn('   Current last plugin:', lastPlugin);
      } else {
        console.log('✅ Babel configuration is correct\n');
      }
    }
  } else {
    console.error('❌ babel.config.cjs not found');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Could not verify Babel configuration:', error.message);
  process.exit(1);
}

// Step 4: Verify .npmrc configuration
console.log('4️⃣ Verifying .npmrc configuration...');
try {
  const npmrcPath = path.join(rootDir, '.npmrc');
  
  if (fs.existsSync(npmrcPath)) {
    const npmrc = fs.readFileSync(npmrcPath, 'utf8');
    
    if (!npmrc.includes('node-linker=hoisted') && !npmrc.includes('shamefully-hoist=true')) {
      console.warn('⚠️ .npmrc should include hoisting configuration for pnpm');
      console.warn('   Add: node-linker=hoisted or shamefully-hoist=true');
    } else {
      console.log('✅ .npmrc configuration is correct\n');
    }
  } else {
    console.warn('⚠️ .npmrc not found\n');
  }
} catch (error) {
  console.warn('⚠️ Could not verify .npmrc:', error.message, '\n');
}

// Step 5: Stop Gradle daemons
console.log('5️⃣ Stopping Gradle daemons...');
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

// Step 6: Clean Gradle cache
console.log('6️⃣ Cleaning Gradle cache...');
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

// Step 7: Remove android and ios folders
console.log('7️⃣ Removing android and ios folders...');
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

// Step 8: Reinstall dependencies with hoisting
console.log('8️⃣ Reinstalling dependencies with hoisting...');
console.log('   This ensures proper module resolution for Gradle...\n');
try {
  execSync('pnpm install --shamefully-hoist', { 
    cwd: rootDir,
    stdio: 'inherit',
    timeout: 180000
  });
  console.log('\n✅ Dependencies reinstalled with hoisting\n');
} catch (error) {
  console.error('❌ Failed to reinstall dependencies:', error.message);
  process.exit(1);
}

// Step 9: Prebuild Android
console.log('9️⃣ Running prebuild for Android...');
console.log('   This may take a few minutes...\n');
try {
  execSync('npx expo prebuild -p android --clean', { 
    cwd: rootDir,
    stdio: 'inherit',
    timeout: 300000,
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
  console.log('\n✅ Prebuild completed successfully\n');
} catch (error) {
  console.error('❌ Prebuild failed:', error.message);
  console.error('\nTry running manually:');
  console.error('npx expo prebuild -p android --clean');
  process.exit(1);
}

// Step 10: Verify gradle.properties
console.log('🔟 Verifying gradle.properties...');
try {
  const gradlePropertiesPath = path.join(rootDir, 'android', 'gradle.properties');
  
  if (fs.existsSync(gradlePropertiesPath)) {
    const gradleProperties = fs.readFileSync(gradlePropertiesPath, 'utf8');
    
    if (gradleProperties.includes('NODE_BINARY')) {
      console.log('✅ NODE_BINARY is set in gradle.properties');
      
      // Extract and display the NODE_BINARY value
      const nodeBinaryMatch = gradleProperties.match(/NODE_BINARY=(.+)/);
      if (nodeBinaryMatch) {
        console.log(`   NODE_BINARY=${nodeBinaryMatch[1]}\n`);
      }
    } else {
      console.warn('⚠️ NODE_BINARY not found in gradle.properties');
      console.warn('   The config plugin should have added it automatically\n');
    }
  } else {
    console.error('❌ gradle.properties not found');
    console.error('   Prebuild may have failed\n');
  }
} catch (error) {
  console.warn('⚠️ Could not verify gradle.properties:', error.message, '\n');
}

// Success message
console.log('=====================================');
console.log('✅ Build fix completed successfully!');
console.log('=====================================\n');
console.log('Next steps:');
console.log('1. Run: pnpm run android');
console.log('   OR: npx expo run:android');
console.log('2. If the build still fails, check the Gradle error message');
console.log('3. You may need to run: pnpm run gradle:clean\n');
console.log('Troubleshooting:');
console.log('- If Node is not found: Set NODE_BINARY in android/gradle.properties');
console.log('- If modules are missing: Run pnpm install --shamefully-hoist');
console.log('- If Gradle fails: Run cd android && ./gradlew clean --no-daemon\n');
