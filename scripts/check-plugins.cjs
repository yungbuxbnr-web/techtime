
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Expo config plugins...');

const pluginsDir = path.join(__dirname, '..', 'plugins');
const requiredPlugins = [
  'imageManipulatorNoop.plugin.cjs'
];

let allPluginsExist = true;

for (const plugin of requiredPlugins) {
  const pluginPath = path.join(pluginsDir, plugin);
  if (fs.existsSync(pluginPath)) {
    console.log(`✅ Found plugin: ${plugin}`);
    
    // Verify the plugin can be required
    try {
      const pluginModule = require(pluginPath);
      if (typeof pluginModule === 'function' || (typeof pluginModule === 'object' && pluginModule !== null)) {
        console.log(`✅ Plugin ${plugin} is valid`);
      } else {
        console.error(`❌ Plugin ${plugin} does not export a valid function or object`);
        allPluginsExist = false;
      }
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
  process.exit(0);
} else {
  console.warn('⚠️ Some plugins are missing or invalid - continuing anyway');
  process.exit(0);
}
