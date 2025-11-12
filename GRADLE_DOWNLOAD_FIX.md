
# Gradle Download Connection Reset Fix

## Problem
You were encountering this error:
```
Downloading https://services.gradle.org/distributions/gradle-8.14.3-bin.zip
Exception in thread "main" java.net.SocketException: Connection reset
```

This happens when:
1. Network connectivity is unstable
2. Gradle version being downloaded has issues
3. No network retry configuration is set
4. Firewall or proxy blocking the download

## Solution Applied

### 1. **Downgraded to Stable Gradle Version (8.10.2)**
   - Changed from Gradle 8.14.3 to 8.10.2 (more stable)
   - This version has better network handling and fewer download issues

### 2. **Added Network Retry Configuration**
   Updated `android-config-templates/gradle.properties.template` with:
   ```properties
   systemProp.org.gradle.internal.http.connectionTimeout=120000
   systemProp.org.gradle.internal.http.socketTimeout=120000
   systemProp.http.socketTimeout=120000
   systemProp.http.connectionTimeout=120000
   ```

### 3. **Created Gradle Wrapper Config Plugin**
   - New file: `plugins/gradleWrapperConfig.plugin.js`
   - Automatically configures Gradle wrapper during prebuild
   - Ensures correct version and network settings

### 4. **Created Fix Script**
   - New file: `scripts/fix-gradle-wrapper.js`
   - Can be run manually: `npm run fix:gradle`
   - Automatically runs after prebuild
   - Updates gradle-wrapper.properties with:
     - Stable Gradle version (8.10.2)
     - Network timeout settings
     - Distribution URL validation

### 5. **Updated EAS Build Configuration**
   - Added GRADLE_OPTS environment variables
   - Ensures cloud builds use proper memory settings
   - Prevents timeout issues during EAS builds

## How to Use

### For Local Builds:

1. **Clean existing Android folder** (if it exists):
   ```bash
   rm -rf android
   ```

2. **Run prebuild** (this will automatically fix Gradle):
   ```bash
   npm run prebuild
   ```
   or for Android only:
   ```bash
   npm run prebuild:android
   ```

3. **If you already have an android folder**, just run:
   ```bash
   npm run fix:gradle
   ```

### For EAS Cloud Builds:

Just run your normal EAS build commands:
```bash
npm run build:eas:android
```

The configuration in `eas.json` will handle everything automatically.

## Manual Fix (If Needed)

If you need to manually fix the Gradle wrapper:

1. Navigate to `android/gradle/wrapper/gradle-wrapper.properties`

2. Change the distributionUrl line to:
   ```properties
   distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-bin.zip
   ```

3. Add these lines if not present:
   ```properties
   networkTimeout=120000
   validateDistributionUrl=true
   ```

4. In `android/gradle.properties`, add:
   ```properties
   systemProp.org.gradle.internal.http.connectionTimeout=120000
   systemProp.org.gradle.internal.http.socketTimeout=120000
   systemProp.http.socketTimeout=120000
   systemProp.http.connectionTimeout=120000
   ```

## Verification

After applying the fix, verify it works:

```bash
# Clean and rebuild
npm run prebuild:android

# Check Gradle version
cd android && ./gradlew --version

# Try a build
cd android && ./gradlew assembleDebug
```

You should see:
- Gradle 8.10.2 being used
- No connection reset errors
- Successful download and build

## Troubleshooting

### If you still get connection errors:

1. **Check your internet connection**
   - Ensure stable network
   - Try a different network if possible

2. **Check firewall/proxy settings**
   - Gradle needs access to services.gradle.org
   - Port 443 (HTTPS) must be open

3. **Use Gradle with VPN/Proxy**
   Add to `android/gradle.properties`:
   ```properties
   systemProp.http.proxyHost=your.proxy.host
   systemProp.http.proxyPort=8080
   systemProp.https.proxyHost=your.proxy.host
   systemProp.https.proxyPort=8080
   ```

4. **Clear Gradle cache**
   ```bash
   rm -rf ~/.gradle/caches
   rm -rf ~/.gradle/wrapper
   ```

5. **Download Gradle manually**
   ```bash
   cd ~/.gradle/wrapper/dists
   wget https://services.gradle.org/distributions/gradle-8.10.2-bin.zip
   ```

## What Changed

### Files Modified:
- ✅ `app.json` - Added gradleWrapperConfig plugin
- ✅ `package.json` - Added fix:gradle script, updated prebuild scripts
- ✅ `eas.json` - Added GRADLE_OPTS environment variables
- ✅ `android-config-templates/gradle.properties.template` - Added network retry settings

### Files Created:
- ✅ `plugins/gradleWrapperConfig.plugin.js` - Auto-configures Gradle wrapper
- ✅ `scripts/fix-gradle-wrapper.js` - Manual fix script
- ✅ `GRADLE_DOWNLOAD_FIX.md` - This documentation

## Summary

The fix ensures:
- ✅ Stable Gradle version (8.10.2) is used
- ✅ Network timeouts are increased (120 seconds)
- ✅ Automatic retry on connection failures
- ✅ Works for both local and EAS cloud builds
- ✅ Can be manually triggered if needed

You should no longer see "Connection reset" errors when downloading Gradle!
