
# Quick New Architecture Build Reference

## 🎯 Quick Start

### 1. Clean Everything
```bash
rm -rf android/.gradle android/build ios/Pods ios/build node_modules
npm install
```

### 2. Set Environment
```bash
export NODE_ENV=production
```

### 3. Build

**Android:**
```bash
npm run build:android
```

**iOS:**
```bash
cd ios && pod install --repo-update && cd ..
npm run build:ios
```

**Both:**
```bash
npm run build:all
```

## ✅ Key Configuration Points

### New Architecture: ENABLED ✓
- `app.json`: `"newArchEnabled": true`
- `android/gradle.properties`: `newArchEnabled=true`
- `ios/Podfile`: `ENV['RCT_NEW_ARCH_ENABLED'] = '1'`

### Hermes: ENABLED ✓
- `app.json`: `"jsEngine": "hermes"` (both platforms)
- `android/gradle.properties`: `hermesEnabled=true`
- `ios/Podfile`: `$RN_HERMES_ENABLED = true`

### NODE_ENV: FIXED ✓
- `.env`: `NODE_ENV=production`
- `eas.json`: env sections updated
- `android/app/build.gradle`: `tasks.configureEach` added

### Toolchain: ALIGNED ✓
- Gradle: 8.14.x
- AGP: 8.5.0
- Kotlin: 2.1.0
- NDK: 27.1.10909125
- compileSdk/targetSdk: 36

## 🔧 Troubleshooting Quick Fixes

### Reanimated Error
```bash
# Ensure New Arch is enabled
grep "newArchEnabled=true" android/gradle.properties
# Clean and rebuild
rm -rf android/.gradle android/build
```

### NODE_ENV Error
```bash
# Check .env exists
cat .env
# Should show: NODE_ENV=production
export NODE_ENV=production
```

### Memory Error
```bash
# Edit android/gradle.properties
# Ensure: org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1024m
```

### iOS Pod Error
```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install --repo-update
cd ..
```

## 📱 Verify Build Success

### Android
```bash
# Check for AAB file
ls -lh android/app/build/outputs/bundle/release/
```

### iOS
```bash
# Check EAS dashboard or Xcode Organizer
# Look for .ipa file
```

## 🚀 Deploy

### Android (Google Play)
```bash
npm run submit:android
```

### iOS (App Store)
```bash
npm run submit:ios
```

## 📋 Pre-Build Checklist

- [ ] `.env` file exists with `NODE_ENV=production`
- [ ] `app.json` has `"newArchEnabled": true`
- [ ] All dependencies installed: `npm install`
- [ ] iOS pods updated: `cd ios && pod install --repo-update`
- [ ] Clean build artifacts removed
- [ ] Environment variable exported: `export NODE_ENV=production`

## 🎉 Success Indicators

**Android:**
- ✓ Build completes without errors
- ✓ AAB file generated
- ✓ No "assertNewArchitectureEnabledTask" error
- ✓ No NODE_ENV error

**iOS:**
- ✓ Build completes without errors
- ✓ IPA file generated
- ✓ Pods installed successfully
- ✓ No Hermes errors

## 💡 Pro Tips

1. **Always clean before building:**
   ```bash
   rm -rf android/.gradle android/build ios/Pods ios/build
   ```

2. **Set NODE_ENV before every build:**
   ```bash
   export NODE_ENV=production
   ```

3. **Update iOS pods after any config change:**
   ```bash
   cd ios && pod install --repo-update && cd ..
   ```

4. **Check logs for first error:**
   - Don't scroll through all warnings
   - Find the first ERROR line
   - Fix that specific issue

5. **Use EAS Build (recommended):**
   - Handles environment setup automatically
   - Consistent build environment
   - Better error reporting

## 🆘 Still Having Issues?

1. Check `NEW_ARCH_BUILD_CHECKLIST.md` for detailed steps
2. Review `BUILD_NEW_ARCH_GUIDE.md` for comprehensive guide
3. Verify all configuration files match templates
4. Try a completely fresh clone and setup

## 📞 Common Error Messages

| Error | Quick Fix |
|-------|-----------|
| `assertNewArchitectureEnabledTask` | Set `newArchEnabled=true` in gradle.properties |
| `NODE_ENV required` | Create `.env` with `NODE_ENV=production` |
| `OutOfMemoryError` | Increase JVM memory in gradle.properties |
| `Pod install failed` | Clear cache: `pod cache clean --all` |
| `Hermes not found` | Set `hermesEnabled=true` and `jsEngine: hermes` |

---

**Remember:** New Architecture + Hermes = Better Performance! 🚀
