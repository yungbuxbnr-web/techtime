
/**
 * No-op config plugin for expo-image-manipulator
 * 
 * expo-image-manipulator does not require a config plugin for typical operations
 * (resize, rotate, compress). This shim exists as a safety measure if the build
 * pipeline expects a plugin entry.
 * 
 * Usage: Use the runtime API directly:
 * 
 * import * as ImageManipulator from 'expo-image-manipulator';
 * 
 * const result = await ImageManipulator.manipulateAsync(
 *   uri,
 *   [{ resize: { width: 1280 } }, { rotate: 0 }],
 *   { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: false }
 * );
 */
module.exports = function withImageManipulatorNoop(config) {
  return config;
};
