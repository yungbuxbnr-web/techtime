
/**
 * Safe Plugin Wrapper
 * 
 * This wrapper ensures that plugins never throw errors during config generation
 * which can cause "failed to configure project" errors.
 */

/**
 * Wraps a plugin function to catch and log errors without breaking the build
 * @param {Function} pluginFn - The plugin function to wrap
 * @param {string} pluginName - Name of the plugin for logging
 * @returns {Function} - Wrapped plugin function
 */
function safePluginWrapper(pluginFn, pluginName) {
  return (config) => {
    try {
      const result = pluginFn(config);
      return result || config;
    } catch (error) {
      if (typeof console !== 'undefined' && console.error) {
        console.error(`⚠️ Error in plugin ${pluginName}:`, error.message);
        console.error('Continuing with original config...');
      }
      return config;
    }
  };
}

module.exports = { safePluginWrapper };
