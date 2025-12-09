
# Android Home Screen Widget Setup

This app now includes an Android home screen widget that displays live efficiency data and the current time.

## Features

The widget displays:
- **Current Time**: Updates every minute
- **Current Date**: Day of week and date
- **Efficiency Percentage**: Color-coded (Green ≥65%, Yellow 31-64%, Red ≤30%)
- **Sold Hours**: Total hours sold this month
- **Available Hours**: Total available working hours
- **Total AWs**: Total AWs logged this month
- **Last Update Time**: When the data was last refreshed

## How to Add the Widget

### Method 1: Long Press (Most Common)
1. Long-press on an empty area of your Android home screen
2. Tap "Widgets" from the menu that appears
3. Scroll down to find "TechTime"
4. Long-press the "Efficiency Widget" and drag it to your home screen
5. Release to place the widget

### Method 2: Widgets Menu
1. Open your app drawer
2. Tap the "Widgets" tab (usually at the top)
3. Find "TechTime" in the list
4. Long-press the "Efficiency Widget" and drag it to your home screen
5. Release to place the widget

## Widget Updates

The widget automatically updates:
- **Every minute**: Time display refreshes
- **When you open the app**: Data syncs from the app
- **When you add/edit jobs**: Widget updates immediately
- **When you view the dashboard**: Latest stats are pushed to the widget

## Widget Interaction

- **Tap the widget**: Opens the TechTime app directly to the dashboard
- **Resize the widget**: Long-press the widget and drag the corners to resize

## Troubleshooting

### Widget shows "No data yet"
- Open the TechTime app and navigate to the dashboard
- The widget will update automatically with your current stats

### Widget not updating
- Make sure the app has permission to run in the background
- Check that battery optimization is not restricting the app
- Try removing and re-adding the widget

### Widget not appearing in widgets list
- Make sure you've run `npm run prebuild` or `expo prebuild` after updating
- Rebuild the app with `npm run android` or `eas build --platform android`
- The widget only works on Android (not iOS or web)

## Technical Details

### Data Storage
- Widget data is stored in Android SharedPreferences
- Data persists even when the app is closed
- Updates are broadcast to the widget whenever stats change

### Update Frequency
- Time: Every 60 seconds (Android system limit)
- Data: Immediately when app updates stats
- Manual refresh: Tap the widget to open the app

### Battery Impact
- Minimal battery usage (updates only when needed)
- No background services running continuously
- Uses Android's efficient AppWidget framework

## Building the App

To include the widget in your build:

```bash
# Clean prebuild
npm run prebuild

# Build for Android
npm run android

# Or build with EAS
npm run build:eas:android
```

## Widget Customization

The widget appearance is defined in:
- Layout: `android/app/src/main/res/layout/efficiency_widget.xml`
- Background: `android/app/src/main/res/drawable/widget_background.xml`
- Configuration: `android/app/src/main/res/xml/efficiency_widget_info.xml`

## Support

If you encounter any issues with the widget:
1. Check that you're running Android 5.0 (API 21) or higher
2. Ensure the app has all necessary permissions
3. Try reinstalling the app
4. Check the app logs for any error messages

## Future Enhancements

Potential future improvements:
- Multiple widget sizes (small, medium, large)
- Configurable widget themes
- Tap actions for different widget areas
- Historical data graphs on widget
- Quick actions (add job, view stats)
