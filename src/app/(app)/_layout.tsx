/**
 * (app) tab navigator — Apple HIG styled tab bar with dynamic safe area context insets & vector icons
 */

import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useSync } from '@/hooks/useSync';
import { useEmails } from '@/hooks/useEmails';
import { useNotificationDeepLink } from '@/hooks/useNotificationDeepLink';
import { useAuthStore, type AuthStore } from '@/store/auth';
import { SyncProgressScreen } from '@/components/common/SyncProgress';
import { registerBackgroundSync } from '@/services/backgroundSync';
import { getLastSyncAt } from '@/services/cache';
import { syncWidgetData } from '@/services/widgetDataService';

function TabBarIcon({
  name,
  nameFocused,
  focused,
  color,
  badge,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  nameFocused: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
  color: any;
  badge?: number;
}) {
  return (
    <View style={styles.tabIconWrap}>
      <Ionicons
        name={focused ? nameFocused : name}
        size={23}
        color={color}
      />
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const { loadFromCache, runInitialSync, runIncrementalSync, lastSyncAt, isSyncing, status } = useSync();
  const { stats, allEmails } = useEmails();
  const user = useAuthStore((s: AuthStore) => s.user);

  // Wire notification tap → email detail deep linking
  useNotificationDeepLink();

  // On first authenticated mount: load cache → run sync
  useEffect(() => {
    if (!user) return;
    loadFromCache();
    registerBackgroundSync();

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

  const bottomInset = Math.max(insets.bottom, 12);
  const tabBarHeight = 54 + bottomInset;

  if (showSyncOverlay) {
    return <SyncProgressScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: bottomInset,
          },
        ],
        tabBarActiveTintColor: Colors.systemBlue,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
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
        name="search"
        options={{
          title: 'Search',
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
        name="email/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="thread/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="widgets"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 0,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
    letterSpacing: Typography.tracking.tight,
    marginTop: 2,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 26,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: Colors.systemRed,
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
    color: Colors.white,
  },
});
