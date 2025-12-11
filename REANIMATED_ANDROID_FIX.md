
# React Native Reanimated Android Build Fix

## Problem

The Android build fails with the following error:

```
A problem occurred evaluating project ':react-native-reanimated'.
Process 'command 'node'' finished with non-zero exit value 1
```

This error occurs in `node_modules/react-native-reanimated/android/build.gradle` around line 53, where Reanimated tries to execute Node.js commands during the Gradle build process.

## Root Causes

1. **Node.js not resolvable**: Gradle cannot find the `node` executable during the build
2. **Module resolution issues**: pnpm's default non-hoisted structure prevents Reanimated from finding dependencies
3. **Missing Gradle properties**: NODE_BINARY environment variable not set
4. **Babel configuration**: Reanimated plugin not configured correctly

## Solution Applied

### 1. Updated Reanimated Config Plugin

**File**: `plugins/reanimatedConfig.plugin.cjs`

The plugin now:
- Automatically detects the Node.js executable path
- Sets `NODE_BINARY` in `android/gradle.properties`
- Adds required dependencies and packaging options
- Configures proper SDK versions for Gradle 9 compatibility

Key additions:
```javascript
// Automatically finds Node.js path
function getNodePath() {
  try {
    const nodePath = execSync('which node', { encoding: 'utf8' }).trim();
    return nodePath;
  } catch (error) {
    // Fallback to common paths
    return '/usr/local/bin/node';
  }
}

// Sets NODE_BINARY in gradle.properties
{ type: 'property', key: 'NODE_BINARY', value: nodePath }
```

### 2. Updated .npmrc for pnpm Hoisting

**File**: `.npmrc`

Added hoisting configuration to ensure proper module resolution:
```
node-linker=hoisted
shamefully-hoist=true
auto-install-peers=true
```

This ensures that all dependencies are accessible to Gradle during the build process.

### 3. Enhanced Build Fix Script

**File**: `scripts/fix-reanimated-build.cjs`

The script now:
- Verifies Node.js version (18-22)
- Checks Reanimated installation
- Validates Babel configuration
- Verifies .npmrc hoisting settings
- Reinstalls dependencies with hoisting
- Runs prebuild with proper environment
- Verifies gradle.properties after prebuild

### 4. Babel Configuration

**File**: `babel.config.cjs`

Already correctly configured with `react-native-reanimated/plugin` as the last plugin:
```javascript
plugins: [
  '@babel/plugin-proposal-export-namespace-from',
  'babel-plugin-module-resolver',
  'react-native-reanimated/plugin', // MUST be last
]
```

## How to Apply the Fix

### Automatic Fix (Recommended)

Run the automated fix script:

```bash
pnpm run fix:reanimated
```

This will:
1. Verify your environment
2. Clean existing builds
3. Reinstall dependencies with hoisting
4. Run prebuild with proper configuration
5. Verify the fix was applied

### Manual Fix

If the automatic fix doesn't work, follow these steps:

#### Step 1: Update .npmrc

Ensure your `.npmrc` includes:
```
node-linker=hoisted
shamefully-hoist=true
```

#### Step 2: Reinstall Dependencies

```bash
pnpm install --shamefully-hoist
```

#### Step 3: Clean Existing Builds

```bash
# Stop Gradle daemons
cd android && ./gradlew --stop

# Clean Gradle cache
cd android && ./gradlew clean --no-daemon

# Remove android and ios folders
rm -rf android ios
```

#### Step 4: Run Prebuild

```bash
npx expo prebuild -p android --clean
```

#### Step 5: Verify gradle.properties

Check that `android/gradle.properties` contains:
```
NODE_BINARY=/usr/local/bin/node
```

If not, add it manually with the correct path to your Node.js executable.

#### Step 6: Build

```bash
pnpm run android
```

## Verification

After applying the fix, verify:

1. **Node.js path is set**:
   ```bash
   cat android/gradle.properties | grep NODE_BINARY
   ```
   Should output: `NODE_BINARY=/usr/local/bin/node` (or your Node path)

2. **Dependencies are hoisted**:
   ```bash
   ls node_modules/react-native-reanimated
   ```
   Should show the package directory

3. **Babel config is correct**:
   ```bash
   cat babel.config.cjs | grep reanimated
   ```
   Should show `react-native-reanimated/plugin` as the last plugin

## Troubleshooting

### Build still fails with Node error

1. **Check Node.js version**:
   ```bash
   node --version
   ```
   Must be between 18 and 22.

2. **Manually set NODE_BINARY**:
   Find your Node path:
   ```bash
   which node
   ```
   
   Add to `android/gradle.properties`:
   ```
   NODE_BINARY=/path/to/your/node
   ```

3. **Try different Node version**:
   ```bash
   nvm install 20
   nvm use 20
   pnpm run fix:reanimated
   ```

### Module resolution errors

1. **Ensure hoisting is enabled**:
   ```bash
   cat .npmrc | grep hoist
   ```

2. **Reinstall with hoisting**:
   ```bash
   rm -rf node_modules
   pnpm install --shamefully-hoist
   ```

### Gradle cache issues

1. **Clean Gradle cache**:
   ```bash
   cd android
   ./gradlew clean --no-daemon
   ./gradlew --stop
   ```

2. **Clear Gradle global cache**:
   ```bash
   rm -rf ~/.gradle/caches/
   ```

### Prebuild fails

1. **Check config plugins**:
   ```bash
   pnpm run check-plugins
   ```

2. **Run prebuild with verbose output**:
   ```bash
   npx expo prebuild -p android --clean --verbose
   ```

## Environment Variables

The following environment variables can be set for the build:

- `NODE_BINARY`: Path to Node.js executable (set automatically by plugin)
- `NODE_ENV`: Should be `production` for builds
- `NODE_OPTIONS`: Set to `--max-old-space-size=4096` for large projects

## CI/CD Configuration

For CI/CD environments (GitHub Actions, GitLab CI, etc.):

1. **Set NODE_BINARY environment variable**:
   ```yaml
   env:
     NODE_BINARY: /usr/local/bin/node
   ```

2. **Use Node 18 or 20**:
   ```yaml
   - uses: actions/setup-node@v3
     with:
       node-version: '20'
   ```

3. **Install with hoisting**:
   ```yaml
   - run: pnpm install --shamefully-hoist
   ```

4. **Run prebuild before build**:
   ```yaml
   - run: npx expo prebuild -p android --clean
   ```

## Additional Resources

- [React Native Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)
- [pnpm Hoisting Documentation](https://pnpm.io/npmrc#shamefully-hoist)
- [Gradle Build Configuration](https://docs.gradle.org/current/userguide/build_environment.html)

## Summary

The fix ensures that:
1. Node.js is resolvable during Gradle build via `NODE_BINARY`
2. Dependencies are properly hoisted for module resolution
3. Babel is correctly configured with Reanimated plugin
4. Gradle properties are set for optimal build performance

After applying this fix, the Android build should complete successfully without Node execution errors.
