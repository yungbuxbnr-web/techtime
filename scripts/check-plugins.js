
/**
 * Prebuild check to ensure expo-image-manipulator is not in the plugins array.
 * 
 * expo-image-manipulator does not ship with a config plugin, so including it
 * in the plugins array causes build errors:
 * "Unable to resolve a valid config plugin for expo-image-manipulator"
 * 
 * This script prevents that error by failing the build early if the plugin
 * is incorrectly included.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const appJsonPath = join(__dirname, '..', 'app.json');
  const appJsonContent = readFileSync(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonContent);

  const plugins = appJson.expo?.plugins || [];

  // Check if expo-image-manipulator is in the plugins array
  const hasImageManipulator = plugins.some(plugin => {
    if (typeof plugin === 'string') {
      return plugin === 'expo-image-manipulator';
    }
    if (Array.isArray(plugin)) {
      return plugin[0] === 'expo-image-manipulator';
    }
    return false;
  });

  if (hasImageManipulator) {
    console.error('\n❌ ERROR: expo-image-manipulator found in plugins array\n');
    console.error('expo-image-manipulator does not have a config plugin.');
    console.error('Remove it from the plugins array in app.json.\n');
    console.error('Use the runtime API instead:');
    console.error('  import * as ImageManipulator from \'expo-image-manipulator\';\n');
    process.exit(1);
  }

  console.log('✅ Plugin configuration check passed');
} catch (error) {
  console.error('Error checking plugins:', error.message);
  process.exit(1);
}
