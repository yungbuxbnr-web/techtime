
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Expo config plugins...');

const pluginsDir = path.join(__dirname, '..', 'plugins');
const requiredPlugins = [
  'gradleWrapperConfig.plugin.cjs',
  'imageManipulatorNoop.plugin.cjs'
];

let allPluginsExist = true;

for (const plugin of requiredPlugins) {
  const pluginPath = path.join(pluginsDir, plugin);
  if (fs.existsSync(pluginPath)) {
    console.log(`✅ Found plugin: ${plugin}`);
  } else {
    console.warn(`⚠️ Missing plugin: ${plugin}`);
    allPluginsExist = false;
  }
}

if (allPluginsExist) {
  console.log('✅ All required plugins are present');
} else {
  console.warn('⚠️ Some plugins are missing, but continuing...');
}

// Don't fail the build, just warn
process.exit(0);
