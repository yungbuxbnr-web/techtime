
# Widget Integration Instructions

To complete the widget integration, you need to manually register the `WidgetPackage` in your `MainApplication.java` file.

## Step 1: Locate MainApplication.java

The file is located at:
```
android/app/src/main/java/com/brcarszw/techtracer/MainApplication.java
```

## Step 2: Import the WidgetPackage

Add this import at the top of the file with the other imports:

```java
import com.brcarszw.techtracer.widget.WidgetPackage;
```

## Step 3: Register the Package

Find the `getPackages()` method in the `MainApplication` class. It should look something like this:

```java
@Override
protected List<ReactPackage> getPackages() {
  @SuppressWarnings("UnnecessaryLocalVariable")
  List<ReactPackage> packages = new PackageList(this).getPackages();
  // Packages that cannot be autolinked yet can be added manually here
  return packages;
}
```

Add the `WidgetPackage` to the packages list:

```java
@Override
protected List<ReactPackage> getPackages() {
  @SuppressWarnings("UnnecessaryLocalVariable")
  List<ReactPackage> packages = new PackageList(this).getPackages();
  // Packages that cannot be autolinked yet can be added manually here
  packages.add(new WidgetPackage()); // Add this line
  return packages;
}
```

## Step 4: Rebuild the App

After making these changes, rebuild your app:

```bash
# Clean and rebuild
npm run gradle:clean
npm run prebuild
npm run android
```

## Verification

To verify the widget is working:

1. Build and install the app on your Android device
2. Open the app and navigate to the dashboard
3. Long-press on your home screen
4. Tap "Widgets"
5. Look for "TechTime" in the widgets list
6. Add the "Efficiency Widget" to your home screen

The widget should display your current efficiency data and update automatically.

## Troubleshooting

### Widget not appearing in widgets list
- Make sure you've added the import and registered the package
- Clean and rebuild the app completely
- Check for any build errors in the console

### Widget shows "No data yet"
- Open the app and navigate to the dashboard
- The widget will update automatically with your stats

### Build errors
- Make sure all Java files are in the correct directories
- Check that package names match your app's package name
- Verify that all imports are correct

## Alternative: Automatic Registration (Expo Config Plugin)

If you want to automate this process, you can enhance the `androidWidget.plugin.js` to modify the `MainApplication.java` file automatically. However, manual registration is more reliable and easier to debug.
