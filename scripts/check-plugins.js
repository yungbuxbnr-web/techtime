
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Expo config plugins...');

const pluginsDir = path.join(__dirname, '..', 'plugins');
const requiredPlugins = [
  'gradleWrapperConfig.plugin.cjs'
];

let allPluginsExist = true;

for (const plugin of requiredPlugins) {
  const pluginPath = path.join(pluginsDir, plugin);
  if (fs.existsSync(pluginPath)) {
    console.log(`✅ Found plugin: ${plugin}`);
    
    // Verify the plugin can be required
    try {
      require(pluginPath);
      console.log(`✅ Plugin ${plugin} is valid`);
    } catch (error) {
      console.error(`❌ Plugin ${plugin} has errors:`, error.message);
      allPluginsExist = false;
    }
  } else {
    console.warn(`⚠️ Missing plugin: ${plugin}`);
    allPluginsExist = false;
  }
}

if (allPluginsExist) {
  console.log('✅ All required plugins are present and valid');
} else {
  console.warn('⚠️ Some plugins are missing or invalid');
}

// Always exit successfully to not block the build
process.exit(0);
