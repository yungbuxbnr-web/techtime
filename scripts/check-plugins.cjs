
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Expo config plugins...\n');

const rootDir = path.join(__dirname, '..');
const pluginsDir = path.join(rootDir, 'plugins');

const requiredPlugins = [
  'fbjniExclusion.plugin.cjs',
  'reanimatedConfig.plugin.cjs',
  'gradleWrapperConfig.plugin.cjs',
  'androidWidget.plugin.js',
];

let allPluginsExist = true;

requiredPlugins.forEach(plugin => {
  const pluginPath = path.join(pluginsDir, plugin);
  if (fs.existsSync(pluginPath)) {
    console.log(`✅ ${plugin} exists`);
  } else {
    console.error(`❌ ${plugin} is missing`);
    allPluginsExist = false;
  }
});

if (!allPluginsExist) {
  console.error('\n❌ Some required plugins are missing!');
  console.error('Please ensure all plugins are present before running prebuild.');
  process.exit(1);
}

console.log('\n✅ All required plugins are present\n');
