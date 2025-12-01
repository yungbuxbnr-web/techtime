
# iOS Build Guide for TechTime

This guide will help you build and run your TechTime app on iOS devices and simulators.

## Prerequisites

### Required Software
1. **macOS** - iOS development requires a Mac computer
2. **Xcode** - Download from the Mac App Store (version 14.0 or later recommended)
3. **Xcode Command Line Tools** - Install by running:
   ```bash
   xcode-select --install
   ```
4. **CocoaPods** - Install by running:
   ```bash
   sudo gem install cocoapods
   ```
5. **Node.js** - Version 18 or higher (already installed based on your package.json)

### Apple Developer Account
- For testing on physical devices: Free Apple Developer account
- For App Store distribution: Paid Apple Developer Program membership ($99/year)

## Configuration Overview

Your app is already configured with the following iOS settings:

### Bundle Identifier
- **Bundle ID**: `com.bnr.techtime`
- This uniquely identifies your app in the Apple ecosystem

### Permissions (Info.plist)
Your app requests the following permissions:
- **Face ID / Touch ID**: For secure authentication
- **Camera**: For scanning vehicle registration plates and job cards
- **Photo Library**: For saving exported PDF reports
- **Background Modes**: For notifications and background tasks

### Background Capabilities
- `fetch` - Background fetch for data updates
- `remote-notification` - Push notifications
- `processing` - Background processing tasks

## Building for iOS

### Method 1: Local Development Build (Recommended for Testing)

#### Step 1: Generate iOS Native Project
```bash
npm run prebuild:ios
```

This command will:
- Generate the `ios/` directory with Xcode project files
- Install all necessary CocoaPods dependencies
- Configure all permissions and capabilities

#### Step 2: Install CocoaPods Dependencies
```bash
cd ios
pod install
cd ..
```

#### Step 3: Run on iOS Simulator
```bash
npm run ios
```

Or with Expo CLI:
```bash
npx expo run:ios
```

#### Step 4: Run on Physical Device
1. Connect your iPhone/iPad via USB
2. Open Xcode and select your device from the device dropdown
3. Run:
   ```bash
   npx expo run:ios --device
   ```

### Method 2: EAS Build (Cloud Build Service)

EAS Build allows you to build your app in the cloud without needing a Mac.

#### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

#### Step 2: Login to Expo
```bash
eas login
```

#### Step 3: Configure EAS Build
```bash
eas build:configure
```

#### Step 4: Build for iOS
For development/testing:
```bash
npm run build:preview:ios
```

For production:
```bash
npm run build:eas:ios
```

## Testing on iOS Simulator

### List Available Simulators
```bash
xcrun simctl list devices
```

### Run on Specific Simulator
```bash
npx expo run:ios --simulator="iPhone 15 Pro"
```

### Common Simulator Devices
- iPhone 15 Pro
- iPhone 15
- iPhone 14 Pro
- iPhone SE (3rd generation)
- iPad Pro (12.9-inch)

## Testing on Physical iOS Device

### For Development (Free Account)
1. Connect your iPhone/iPad via USB
2. Open Xcode
3. Go to Xcode → Settings → Accounts
4. Add your Apple ID
5. Select your device in Xcode
6. Xcode will automatically create a provisioning profile
7. Run: `npx expo run:ios --device`

### Trust Developer Certificate
After installing on your device:
1. Go to Settings → General → VPN & Device Management
2. Tap on your developer certificate
3. Tap "Trust [Your Name]"

## Building for App Store Distribution

### Step 1: Prepare App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app
3. Fill in app information (name, description, screenshots, etc.)

### Step 2: Update eas.json
Edit the `submit.production.ios` section in `eas.json`:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      }
    }
  }
}
```

### Step 3: Build for Production
```bash
npm run build:eas:ios
```

### Step 4: Submit to App Store
```bash
npm run submit:ios
```

## Troubleshooting

### Issue: "No provisioning profile found"
**Solution**: 
1. Open Xcode
2. Open `ios/TechTime.xcworkspace` (not .xcodeproj)
3. Select the project in the navigator
4. Go to Signing & Capabilities
5. Select your team
6. Enable "Automatically manage signing"

### Issue: "CocoaPods not installed"
**Solution**:
```bash
sudo gem install cocoapods
cd ios
pod install
```

### Issue: "Command PhaseScriptExecution failed"
**Solution**:
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Issue: Build fails with "Module not found"
**Solution**:
```bash
# Clean build
rm -rf ios/build
rm -rf ios/Pods
cd ios
pod install
cd ..
npx expo run:ios
```

### Issue: "Unable to boot simulator"
**Solution**:
```bash
# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all
```

## App Capabilities Verification

After building, verify these capabilities are enabled in Xcode:

1. Open `ios/TechTime.xcworkspace` in Xcode
2. Select the TechTime target
3. Go to "Signing & Capabilities" tab
4. Verify the following are present:
   - Background Modes (with Fetch, Remote notifications, Background processing checked)
   - Push Notifications (if using push notifications)

## Performance Optimization

### Enable Hermes Engine
Your app is already configured to use Hermes (JavaScript engine) for better performance:
- Faster app startup
- Reduced memory usage
- Smaller app size

This is configured in `app.config.js`:
```javascript
ios: {
  jsEngine: 'hermes'
}
```

## App Size Optimization

To reduce your iOS app size:
1. Remove unused assets from `assets/` folder
2. Use appropriate image formats (WebP for photos, PNG for icons)
3. Enable bitcode in Xcode (for App Store builds)

## Next Steps

1. **Test thoroughly** on both simulator and physical devices
2. **Test all permissions** - Camera, Face ID, Photo Library access
3. **Test background modes** - Notifications, background fetch
4. **Test on different iOS versions** - iOS 13.4+ (your deployment target)
5. **Prepare App Store assets**:
   - App icon (1024x1024px)
   - Screenshots for different device sizes
   - App description and keywords
   - Privacy policy URL

## Useful Commands

```bash
# Start development server
npm run dev:ios

# Build for iOS simulator
npm run ios

# Build release version locally
npm run build:ios

# Clean and rebuild
rm -rf ios/build && npx expo run:ios

# View iOS logs
npx react-native log-ios

# Open in Xcode
open ios/TechTime.xcworkspace
```

## Resources

- [Expo iOS Documentation](https://docs.expo.dev/workflow/ios/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Support

If you encounter issues:
1. Check the [Expo Forums](https://forums.expo.dev/)
2. Review [React Native iOS Issues](https://github.com/facebook/react-native/issues)
3. Check [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

---

**Note**: Your app is fully configured for iOS. Simply run `npm run prebuild:ios` followed by `npm run ios` to start building and testing on iOS!
