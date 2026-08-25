/**
 * plugins/withWidgets.js — Expo Config Plugin for Oryn Home Screen Widgets.
 * Configures Android AppWidgetProvider metadata and iOS WidgetKit targets.
 */

const { withAndroidManifest, withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = function withWidgets(config) {
  // 1. Android App Widget Provider declarations
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    const widgetProviders = [
      {
        $: {
          'android:name': '.widgets.AcademicWidgetProvider',
          'android:exported': 'true',
          'android:label': 'Oryn Timetable',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/widget_academic_info',
            },
          },
        ],
      },
      {
        $: {
          'android:name': '.widgets.MessWidgetProvider',
          'android:exported': 'true',
          'android:label': 'Oryn Mess Menu',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/widget_mess_info',
            },
          },
        ],
      },
      {
        $: {
          'android:name': '.widgets.CategoryEmailsWidgetProvider',
          'android:exported': 'true',
          'android:label': 'Oryn Category Mails',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/widget_emails_info',
            },
          },
        ],
      },
    ];

    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    widgetProviders.forEach((provider) => {
      const exists = mainApplication.receiver.some(
        (r) => r.$['android:name'] === provider.$['android:name']
      );
      if (!exists) {
        mainApplication.receiver.push(provider);
      }
    });

    return config;
  });

  // 2. iOS App Group entitlement for shared storage between main app & iOS widgets
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [
      'group.com.oryn.campus.widgets',
    ];
    return config;
  });

  return config;
};
