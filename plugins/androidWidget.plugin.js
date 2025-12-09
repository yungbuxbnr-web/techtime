
const { withAndroidManifest, withMainActivity, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin for Android Home Screen Widget
 * 
 * This plugin adds the necessary Android configuration for a home screen widget
 * that displays efficiency data and current time.
 */

const withAndroidWidget = (config) => {
  // Add widget receiver to AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Add widget receiver
    if (!application.receiver) {
      application.receiver = [];
    }

    // Check if widget receiver already exists
    const widgetReceiverExists = application.receiver.some(
      (receiver) => receiver.$['android:name'] === '.widget.EfficiencyWidgetProvider'
    );

    if (!widgetReceiverExists) {
      application.receiver.push({
        $: {
          'android:name': '.widget.EfficiencyWidgetProvider',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
              { $: { 'android:name': 'com.brcarszw.techtracer.WIDGET_UPDATE' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/efficiency_widget_info',
            },
          },
        ],
      });
    }

    return config;
  });

  // Add widget files to android project
  config = withMainActivity(config, async (config) => {
    return config;
  });

  return config;
};

module.exports = withAndroidWidget;
