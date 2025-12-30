
# Android Setup Guide for TechTime

## Prerequisites

### 1. Install Android Studio
Download and install Android Studio from: https://developer.android.com/studio

### 2. Install Android SDK
During Android Studio installation, ensure you install:
- Android SDK Platform 35 (Android 15)
- Android SDK Build-Tools 35.0.0
- Android SDK Platform-Tools
- Android Emulator
- Android SDK Tools

### 3. Set Environment Variables
Add these to your shell profile (~/.bashrc, ~/.zshrc, etc.):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk        # Linux
# export ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk  # Windows

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

### 4. Install Java Development Kit (JDK)
Install JDK 17 (required for React Native 0.76+):
- macOS: `brew install openjdk@17`
- Linux: `sudo apt install openjdk-17-jdk`
- Windows: Download from Oracle or use Chocolatey

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Native Android Project
```bash
npm run prebuild:android
```

This creates the `android/` directory with all configurations applied.

### 3. Start Development Server
```bash
npm run dev:android
```

### 4. Run on Emulator
```bash
npm run android
```

### 5. Run on Physical Device
```bash
npm run android:device
```

## Building for Production

### Local APK Build
```bash
npm run build:android
```

The APK will be in: `android/app/build/outputs/apk/release/`

### EAS Cloud Build (Recommended)

#### APK Build
```bash
npm run build:android:apk
```

#### AAB Build (for Play Store)
```bash
npm run build:android:aab
```

## Testing

### Run on Emulator
1. Open Android Studio
2. Go to Tools > Device Manager
3. Create a new virtual device (recommended: Pixel 6 with API 35)
4. Start the emulator
5. Run: `npm run android`

### Run on Physical Device
1. Enable Developer Options on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Go to Settings > Developer Options
   - Enable "USB Debugging"
3. Connect device via USB
4. Run: `npm run android:device`

## Troubleshooting

### Gradle Build Fails

#### Clean Gradle Cache
```bash
npm run gradle:clean
npm run gradle:stop
```

#### Regenerate Native Files
```bash
npm run prebuild:android
```

### Kotlin Version Errors
If you see "Can't find KSP version for Kotlin version":
1. Check `gradle.properties` has `kotlinVersion=2.0.21`
2. Run `npm run prebuild:android`
3. Try building again

### Memory Issues
If build fails with OutOfMemoryError:
1. Close other applications
2. Increase heap size in `gradle.properties`
3. Try building again

### Port Already in Use
If Metro bundler port is in use:
```bash
npx react-native start --reset-cache --port 8082
```

### ADB Connection Issues
```bash
adb kill-server
adb start-server
adb devices
```

## Gradle Commands

### Check Dependencies
```bash
npm run android:dependencies
```

### Run Gradle Check
```bash
npm run android:check
```

### Build Release APK Directly
```bash
npm run gradle:build
```

## Configuration Files

### Key Android Configuration Files
- `app.json` - Expo app configuration
- `app.config.js` - Dynamic Expo configuration
- `gradle.properties` - Gradle build properties
- `eas.json` - EAS Build configuration
- `plugins/kotlinVersion.plugin.cjs` - Kotlin version config
- `plugins/androidOptimization.plugin.cjs` - Android optimizations

### Android-Specific Settings
- **Package Name**: com.brcarszw.techtracer
- **Version Code**: 2
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 35 (Android 15)
- **Compile SDK**: 35 (Android 15)

## Performance Tips

### Development
- Use physical device for better performance
- Enable Fast Refresh for instant updates
- Use Hermes for faster JavaScript execution

### Production
- ProGuard minification is enabled
- Resource shrinking is enabled
- Hermes bytecode compilation is enabled

## Security

### Permissions
The app requests these permissions:
- Biometric authentication (fingerprint/face)
- Camera (for scanning)
- Notifications
- Storage (for file operations)

### Privacy
- No location tracking
- No data collection
- Local storage only
- GDPR compliant

## Deployment

### Google Play Store
1. Build AAB: `npm run build:android:aab`
2. Download from EAS Build
3. Upload to Google Play Console
4. Fill in store listing
5. Submit for review

### Direct Distribution
1. Build APK: `npm run build:android:apk`
2. Download from EAS Build
3. Share APK file directly
4. Users must enable "Install from Unknown Sources"

## Support

### Common Issues
- Check `.android-config-notes.md` for detailed configuration info
- Review error logs in Android Studio Logcat
- Check Metro bundler logs for JavaScript errors

### Getting Help
- Expo Documentation: https://docs.expo.dev
- React Native Documentation: https://reactnative.dev
- Android Developer Documentation: https://developer.android.com

## Next Steps
1. Test on multiple Android devices
2. Test different Android versions (7.0 - 15)
3. Test different screen sizes
4. Optimize performance
5. Submit to Play Store
