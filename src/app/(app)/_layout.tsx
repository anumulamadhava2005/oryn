/**
 * (app) tab navigator — Apple HIG styled tab bar with dynamic safe area context insets & vector icons
 */

import React, { useEffect, useCallback } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius } from '@/constants/theme';
import { useSync } from '@/hooks/useSync';
import { useEmailsStore } from '@/store/emails';
import { useNotificationDeepLink } from '@/hooks/useNotificationDeepLink';
import { useAuthStore, type AuthStore } from '@/store/auth';
import { usePreferencesStore } from '@/store/preferences';
import { SyncProgressScreen } from '@/components/common/SyncProgress';
import { registerBackgroundSync } from '@/services/backgroundSync';
import { getLastSyncAt } from '@/services/cache';
import { syncWidgetData } from '@/services/widgetDataService';
import { useResponsive } from '@/hooks/useResponsive';
import {
  setupAllNotificationChannels,
  setupNotificationCategories,
  scheduleMorningBriefing,
  scheduleNightlyRadar,
  scheduleClassReminders,
} from '@/services/notifications';

interface TabBarIconProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  nameFocused: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
  color: any;
  badge?: number;
  badgeColor?: string;
}

const TabBarIcon = React.memo(function TabBarIcon({
  name,
  nameFocused,
  focused,
  color,
  badge,
  badgeColor,
}: TabBarIconProps) {
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const isMono = themeMode === 'monochrome';
  const defaultBadgeBg = isMono ? '#EFEFEF' : Colors.systemRed;
  const badgeBg = badgeColor && !isMono ? badgeColor : defaultBadgeBg;
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
});

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { loadFromCache, runInitialSync, runIncrementalSync, lastSyncAt, isSyncing } = useSync();
  const emailsCount = useEmailsStore((s) => s.emails.length);
  const unreadCount = useEmailsStore(
    useCallback((s) => s.emails.reduce((acc, e) => acc + (e.isUnread ? 1 : 0), 0), [])
  );
  const upcomingDeadlinesCount = useEmailsStore(
    useCallback((s) => {
      const now = Date.now();
      return s.emails.reduce((acc, e) => {
        if (e.deadline && new Date(e.deadline).getTime() >= now) return acc + 1;
        return acc;
      }, 0);
    }, [])
  );
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
    scheduleClassReminders().catch(() => {});

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
    if (!isSyncing && emailsCount > 0) {
      syncWidgetData();
    }
  }, [isSyncing, emailsCount]);

  // Show full-screen sync progress during initial sync (no cached emails)
  const showSyncOverlay = isSyncing && emailsCount === 0 && !lastSyncAt;

  if (showSyncOverlay) {
    return <SyncProgressScreen />;
  }

  const { isTablet, width } = useResponsive();
  const bottomInset = insets.bottom;
  const tabBarHeight = isTablet ? 60 : 52 + bottomInset;

  return (
    <Tabs
      backBehavior="history"
      initialRouteName={!showInboxTab || startScreen === 'today' ? 'today' : 'index'}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: isTablet ? 0 : StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingBottom: isTablet ? 6 : bottomInset > 0 ? bottomInset : 4,
          paddingTop: 6,
          elevation: 8,
          ...(isTablet
            ? {
                position: 'absolute',
                bottom: Math.max(bottomInset, 16),
                left: Math.max(20, (width - Math.min(width - 40, 560)) / 2),
                right: Math.max(20, (width - Math.min(width - 40, 560)) / 2),
                borderRadius: Radius['2xl'],
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.12)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 18,
                elevation: 12,
              }
            : {}),
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
              badge={unreadCount}
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
              badge={upcomingDeadlinesCount > 0 ? upcomingDeadlinesCount : undefined}
              badgeColor={Colors.systemOrange}
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
      <Tabs.Screen
        name="lost-found-detail"
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
    width: 32,
    height: 26,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    lineHeight: 12,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
