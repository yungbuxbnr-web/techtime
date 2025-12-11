
# Quick Fix: Android Build Error

## Error Message
```
A problem occurred evaluating project ':react-native-reanimated'.
Process 'command 'node'' finished with non-zero exit value 1
```

## Quick Fix (One Command)

Run this command to automatically fix the issue:

```bash
pnpm run fix:reanimated
```

This will:
- ✅ Verify your Node.js version (must be 18-22)
- ✅ Check Reanimated installation
- ✅ Validate Babel configuration
- ✅ Reinstall dependencies with proper hoisting
- ✅ Clean existing builds
- ✅ Run prebuild with correct configuration
- ✅ Set NODE_BINARY in gradle.properties

## After Running the Fix

Build your Android app:

```bash
pnpm run android
```

Or for release build:

```bash
pnpm run build:android
```

## If the Quick Fix Doesn't Work

### Option 1: Manual Node Path

1. Find your Node.js path:
   ```bash
   which node
   ```

2. After running `pnpm run fix:reanimated`, edit `android/gradle.properties`:
   ```
   NODE_BINARY=/your/node/path
   ```

3. Build again:
   ```bash
   pnpm run android
   ```

### Option 2: Try Different Node Version

```bash
# Install Node 20 (recommended)
nvm install 20
nvm use 20

# Run the fix again
pnpm run fix:reanimated

# Build
pnpm run android
```

### Option 3: Clean Everything

```bash
# Stop Gradle
cd android && ./gradlew --stop

# Clean
cd android && ./gradlew clean --no-daemon

# Remove build folders
rm -rf android ios

# Reinstall
pnpm install --shamefully-hoist

# Prebuild
npx expo prebuild -p android --clean

# Build
pnpm run android
```

## What Was Fixed

1. **NODE_BINARY**: Automatically set in `android/gradle.properties` to point to your Node.js executable
2. **Hoisting**: Updated `.npmrc` to use `shamefully-hoist=true` for proper module resolution
3. **Config Plugin**: Enhanced `plugins/reanimatedConfig.plugin.cjs` to automatically detect and set Node path
4. **Babel**: Already correctly configured with `react-native-reanimated/plugin` as last plugin

## Verification

Check if the fix was applied:

```bash
# Check NODE_BINARY is set
cat android/gradle.properties | grep NODE_BINARY

# Should output something like:
# NODE_BINARY=/usr/local/bin/node
```

## Still Having Issues?

See the detailed troubleshooting guide:
- `REANIMATED_ANDROID_FIX.md` - Complete fix documentation
- `BUILD_TROUBLESHOOTING.md` - General build troubleshooting

Or check the logs:
```bash
# Run with verbose output
npx expo run:android --verbose
```

## Support

If you continue to have issues:
1. Check your Node.js version: `node --version` (must be 18-22)
2. Check your pnpm version: `pnpm --version` (should be 8+)
3. Ensure you're using the correct package manager (pnpm, not npm)
4. Review the complete error log from the build

## Summary

The fix ensures that Gradle can find and execute Node.js during the build process by:
- Setting the `NODE_BINARY` environment variable
- Enabling proper dependency hoisting for pnpm
- Configuring Reanimated correctly in Gradle

After running `pnpm run fix:reanimated`, your Android builds should work without Node execution errors.
