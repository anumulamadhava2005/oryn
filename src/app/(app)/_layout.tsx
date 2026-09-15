/**
 * (app) tab navigator — Apple HIG styled tab bar with dynamic safe area context insets & vector icons
 */

import React, { useEffect } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius } from '@/constants/theme';
import { useSync } from '@/hooks/useSync';
import { useEmails } from '@/hooks/useEmails';
import { useNotificationDeepLink } from '@/hooks/useNotificationDeepLink';
import { useAuthStore, type AuthStore } from '@/store/auth';
import { usePreferencesStore } from '@/store/preferences';
import { SyncProgressScreen } from '@/components/common/SyncProgress';
import { registerBackgroundSync } from '@/services/backgroundSync';
import { getLastSyncAt } from '@/services/cache';
import { syncWidgetData } from '@/services/widgetDataService';
import {
  setupAllNotificationChannels,
  setupNotificationCategories,
  scheduleMorningBriefing,
  scheduleNightlyRadar,
} from '@/services/notifications';

interface TabBarIconProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  nameFocused: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
  color: any;
  badge?: number;
}

function TabBarIcon({
  name,
  nameFocused,
  focused,
  color,
  badge,
}: TabBarIconProps) {
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const isMono = themeMode === 'monochrome';
  const badgeBg = isMono ? '#EFEFEF' : Colors.systemRed;
  const badgeTextColor = isMono ? '#1A1A1A' : Colors.white;

  return (
    <View style={styles.tabIconWrap}>
      <Ionicons
        name={focused ? nameFocused : name}
        size={22}
        color={color}
      />
      {badge != null && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { loadFromCache, runInitialSync, runIncrementalSync, lastSyncAt, isSyncing, status } = useSync();
  const { stats, allEmails } = useEmails();
  const user = useAuthStore((s: AuthStore) => s.user);
  const showInboxTab = usePreferencesStore((s) => s.showInboxTab);
  const startScreen = usePreferencesStore((s) => s.startScreen);

  // Wire notification tap → email detail deep linking
  useNotificationDeepLink();

  // If inbox tab is hidden or start screen is set to Today, redirect from index tab to Today
  useEffect(() => {
    if (!showInboxTab || startScreen === 'today') {
      const activeTab = segments[1] as string | undefined;
      if (!activeTab || activeTab === 'index') {
        router.replace('/(app)/today');
      }
    }
  }, [showInboxTab, startScreen, segments, router]);

  // On first authenticated mount: load cache → run sync → setup notifications
  useEffect(() => {
    if (!user) return;
    loadFromCache();
    registerBackgroundSync();

    // Initialize notification channels, categories & scheduled briefings
    setupAllNotificationChannels().catch(() => {});
    setupNotificationCategories().catch(() => {});
    scheduleMorningBriefing().catch(() => {});
    scheduleNightlyRadar().catch(() => {});

    const storedLastSync = getLastSyncAt();
    if (!storedLastSync) {
      runInitialSync();
    } else {
      runIncrementalSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Sync widget data whenever syncing finishes and data is available
  useEffect(() => {
    if (!isSyncing && allEmails.length > 0) {
      syncWidgetData();
    }
  }, [isSyncing, allEmails.length]);

  // Show full-screen sync progress during initial sync (no cached emails)
  const showSyncOverlay = isSyncing && allEmails.length === 0 && !lastSyncAt;

  if (showSyncOverlay) {
    return <SyncProgressScreen />;
  }

  const bottomInset = insets.bottom;
  const tabBarHeight = 52 + bottomInset;

  return (
    <Tabs
      initialRouteName={!showInboxTab || startScreen === 'today' ? 'today' : 'index'}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingBottom: bottomInset > 0 ? bottomInset : 4,
          paddingTop: 4,
          elevation: 8,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.45)',
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: showInboxTab ? undefined : null,
          title: 'Inbox',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name="mail-outline"
              nameFocused="mail"
              focused={focused}
              color={color}
              badge={stats.unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name="today-outline"
              nameFocused="today"
              focused={focused}
              color={color}
              badge={stats.upcomingDeadlines.length > 0 ? stats.upcomingDeadlines.length : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name="ticket-outline"
              nameFocused="ticket"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lost-found"
        options={{
          title: 'Lost & Found',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name="search-outline"
              nameFocused="search"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name="settings-outline"
              nameFocused="settings"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      {/* Hidden non-tab routes — navigated to programmatically */}
      <Tabs.Screen
        name="search"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="email/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="thread/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="widgets"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="creator-studio"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    paddingTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    letterSpacing: Typography.tracking.tight,
    marginTop: 2,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 24,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -8,
    borderRadius: Radius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.card,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
  },
});
