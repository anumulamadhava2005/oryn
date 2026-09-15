/**
 * Settings screen — Apple HIG Grouped Inset list layout for account info, sync controls, and app metadata.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useEmails } from '@/hooks/useEmails';
import { SyncStatus } from '@/components/common/SyncStatus';
import { clearAllCache } from '@/services/cache';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import { useEmailsStore, type EmailsStore } from '@/store/emails';
import { useSyncStore, type SyncStore } from '@/store/sync';
import { useOnboardingStore } from '@/store/onboarding';
import { usePreferredSendersStore } from '@/store/preferredSenders';
import { usePreferencesStore } from '@/store/preferences';
import { PreferredSendersModal } from '@/components/settings/PreferredSendersModal';
import { useAcademicStore } from '@/store/academicStore';
import { AcademicProfileModal } from '@/components/settings/AcademicProfileModal';
import { TimetableModal } from '@/components/academic/TimetableModal';
import { AboutDeveloperModal } from '@/components/settings/AboutDeveloperModal';
import { OrynLogo } from '@/components/common/OrynLogo';
import { syncWidgetData } from '@/services/widgetDataService';
import { useSDUIStore, useSDUIEnvironment } from '@/store/sduiStore';
import { syncSDUI } from '@/services/sduiService';
import { NotificationPreferencesModal } from '@/components/settings/NotificationPreferencesModal';
import { useNotificationPreferencesStore } from '@/store/notificationPreferences';

function SettingRow({
  icon,
  iconBg,
  label,
  sublabel,
  right,
  onPress,
  destructive,
  showChevron = false,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconBg?: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
    >
      <View style={styles.rowLeftContent}>
        {icon && (
          <View style={[styles.iconBox, { backgroundColor: iconBg ?? Colors.systemBlue }]}>
            <Ionicons name={icon} size={15} color={Colors.white} />
          </View>
        )}
        <View style={styles.labelWrap}>
          <Text style={[styles.rowLabel, destructive && styles.destructive]}>{label}</Text>
          {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        {right}
        {showChevron && (
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        )}
      </View>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { runInitialSync, runIncrementalSync, isSyncing, lastSyncAt } = useSync();
  const { stats } = useEmails();
  const setEmails = useEmailsStore((s: EmailsStore) => s.setEmails);
  const syncStore = useSyncStore();
  const { selectedSenders, filterOnAppOpen } = usePreferredSendersStore();
  const academicProgram = useAcademicStore(s => s.program);
  const academicSemester = useAcademicStore(s => s.semester);
  const { showInboxTab, setShowInboxTab, startScreen, setStartScreen, themeMode, toggleThemeMode } = usePreferencesStore();

  const [showPreferredModal, setShowPreferredModal] = useState(false);
  const [showAcademicModal, setShowAcademicModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);

  const notifEnabled = useNotificationPreferencesStore((s) => s.enabled);
  const notifPlacements = useNotificationPreferencesStore((s) => s.placements);
  const notifDeadlines = useNotificationPreferencesStore((s) => s.deadlines);
  const notifBriefing = useNotificationPreferencesStore((s) => s.morningBriefing);

  const sduiEnvironment = useSDUIEnvironment();
  const sduiEnvOverride = useSDUIStore((s) => s.envOverride);
  const setSDUIEnvOverride = useSDUIStore((s) => s.setEnvOverride);
  const sduiLastFetched = useSDUIStore((s) => s.lastFetchedAt);
  const clearSDUICache = useSDUIStore((s) => s.clearCache);

  const handleManualSync = useCallback(() => {
    if (!lastSyncAt) runInitialSync();
    else runIncrementalSync();
  }, [lastSyncAt, runInitialSync, runIncrementalSync]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear cached emails',
      'This will remove all locally cached emails. A full re-sync will run automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Re-sync',
          style: 'destructive',
          onPress: () => {
            clearAllCache();
            setEmails([]);
            syncStore.startSync();
            runInitialSync();
          },
        },
      ],
    );
  }, [setEmails, syncStore, runInitialSync]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'You will need to sign in again to sync emails.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWithLogo}>
          <OrynLogo size={36} borderRadius={Radius.md} />
          <Text style={styles.pageTitle}>Settings</Text>
        </View>

        {/* Account */}
        <Section title="Account">
          {user && (
            <View style={styles.accountRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>
                  {(user.givenName ?? user.name ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{user.name}</Text>
                <Text style={styles.accountEmail}>{user.email}</Text>
              </View>
            </View>
          )}
          <SettingRow
            icon="log-out-outline"
            iconBg={Colors.systemRed}
            label="Sign out"
            onPress={handleSignOut}
            destructive
          />
        </Section>

        {/* Appearance & Theme */}
        <Section title="Appearance">
          <SettingRow
            icon="color-palette-outline"
            iconBg={themeMode === 'monochrome' ? Colors.surfaceElevated : Colors.systemPurple}
            label="App Theme"
            sublabel={
              themeMode === 'monochrome'
                ? "Monochrome · Minimalist gray-scale luminance"
                : "Current Theme · Apple HIG color psychology"
            }
            right={
              <Pressable
                onPress={() => {
                  hapticMedium();
                  toggleThemeMode();
                }}
                style={[
                  styles.themePillToggle,
                  themeMode === 'monochrome' && styles.themePillToggleMono,
                ]}
              >
                <Ionicons
                  name={themeMode === 'monochrome' ? 'contrast' : 'color-palette'}
                  size={13}
                  color={themeMode === 'monochrome' ? Colors.text : Colors.systemPurple}
                />
                <Text
                  style={[
                    styles.themePillText,
                    themeMode === 'monochrome' ? styles.themePillTextMono : { color: Colors.systemPurple },
                  ]}
                >
                  {themeMode === 'monochrome' ? 'Monochrome' : 'Vibrant'}
                </Text>
              </Pressable>
            }
            showChevron
            onPress={() => {
              hapticMedium();
              toggleThemeMode();
            }}
          />
        </Section>

        {/* Navigation & Layout Preferences */}
        <Section title="Navigation & Layout">
          <SettingRow
            icon="mail-outline"
            iconBg={Colors.systemBlue}
            label="Inbox in Bottom Tabs"
            sublabel={
              showInboxTab
                ? "Inbox tab is visible · Default start screen: Inbox"
                : "Inbox tab is hidden · Start screen set to Today"
            }
            right={
              <Switch
                value={showInboxTab}
                onValueChange={(val) => {
                  hapticMedium();
                  setShowInboxTab(val);
                }}
                trackColor={{ false: Colors.surfaceElevated, true: Colors.systemBlue }}
                thumbColor={Colors.white}
              />
            }
          />
          {showInboxTab && (
            <SettingRow
              icon="navigate-circle-outline"
              iconBg={Colors.systemIndigo}
              label="Default Start Screen"
              sublabel={
                startScreen === 'today'
                  ? "App opens directly on Today (Briefing & Schedule)"
                  : "App opens on Inbox (All Mails)"
              }
              right={
                <Pressable
                  onPress={() => {
                    hapticLight();
                    setStartScreen(startScreen === 'inbox' ? 'today' : 'inbox');
                  }}
                  style={styles.pillToggle}
                >
                  <Text style={styles.pillToggleText}>
                    {startScreen === 'today' ? 'Today' : 'Inbox'}
                  </Text>
                </Pressable>
              }
              showChevron
              onPress={() => {
                hapticLight();
                setStartScreen(startScreen === 'inbox' ? 'today' : 'inbox');
              }}
            />
          )}
        </Section>

        {/* Notifications & Campus Alerts */}
        <Section title="Notifications & Campus Alerts">
          <SettingRow
            icon="notifications-outline"
            iconBg={Colors.systemPurple}
            label="Notification Preferences"
            sublabel={
              !notifEnabled
                ? "Notifications are paused"
                : `Active · ${[
                    notifPlacements ? 'Placements' : null,
                    notifDeadlines ? 'Deadlines' : null,
                    notifBriefing ? 'Daily Briefing' : null,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Custom Alerts'}`
            }
            onPress={() => {
              hapticLight();
              setShowNotifModal(true);
            }}
            showChevron
          />
        </Section>

        {/* Preferences */}
        <Section title="Academic & Filter Preferences">
          <SettingRow
            icon="school-outline"
            iconBg={Colors.systemBlue}
            label="Academic Program & Semester"
            sublabel={`${academicProgram} · ${academicSemester}`}
            onPress={() => {
              hapticLight();
              setShowAcademicModal(true);
            }}
            showChevron
          />
          <SettingRow
            icon="calendar-outline"
            iconBg={Colors.systemTeal}
            label="Class Schedule & Timetable"
            sublabel="Slot-based timetable & eligible courses"
            onPress={() => {
              hapticLight();
              setShowTimetableModal(true);
            }}
            showChevron
          />
          <SettingRow
            icon="filter-outline"
            iconBg={Colors.systemPurple}
            label="Preferred Senders on Launch"
            sublabel={
              filterOnAppOpen
                ? `${selectedSenders.length} sender${selectedSenders.length !== 1 ? 's' : ''} selected · Filter ON`
                : selectedSenders.length > 0
                  ? `${selectedSenders.length} sender${selectedSenders.length !== 1 ? 's' : ''} selected · Filter OFF`
                  : 'Choose senders to see when opening app'
            }
            onPress={() => {
              hapticLight();
              setShowPreferredModal(true);
            }}
            showChevron
          />
        </Section>

        {/* Sync */}
        <Section title="Sync & Storage">
          <SettingRow
            icon="sync-outline"
            iconBg={Colors.systemBlue}
            label="Sync status"
            right={<SyncStatus />}
          />
          <SettingRow
            icon="mail-outline"
            iconBg={Colors.systemIndigo}
            label="Emails cached"
            right={<Text style={styles.valueText}>{stats.totalCount}</Text>}
          />
          <SettingRow
            icon="refresh-outline"
            iconBg={Colors.systemGreen}
            label="Sync now"
            sublabel={isSyncing ? 'Syncing…' : 'Fetch latest emails'}
            onPress={isSyncing ? undefined : handleManualSync}
            showChevron={!isSyncing}
          />
          <SettingRow
            icon="trash-outline"
            iconBg={Colors.systemOrange}
            label="Clear cache & re-sync"
            sublabel="Downloads all emails from scratch"
            onPress={handleClearCache}
            destructive
          />
        </Section>

        {/* Widgets */}
        <Section title="Home Screen Widgets">
          <SettingRow
            icon="phone-portrait-outline"
            iconBg={Colors.systemTeal}
            label="Sync Widget Data"
            sublabel="Push latest timetable, menu & emails to home screen widgets"
            onPress={() => {
              hapticLight();
              syncWidgetData();
              Alert.alert('Widgets Synced', 'Your home screen widgets have been updated with the latest data.');
            }}
            showChevron
          />
          <SettingRow
            icon="information-circle-outline"
            iconBg={Colors.systemGray}
            label="How to Add Widgets"
            sublabel="Long-press home screen → Widgets → search 'Oryn'"
          />
        </Section>

        {/* Remote UI & SDUI */}
        <Section title="Remote UI Engine (SDUI)">
          <SettingRow
            icon="cloud-outline"
            iconBg={Colors.systemIndigo}
            label="Target Environment"
            sublabel={`Active: ${sduiEnvironment.toUpperCase()} · Mode: ${sduiEnvOverride}`}
            right={
              <Pressable
                onPress={() => {
                  hapticLight();
                  const next = sduiEnvOverride === 'auto' ? 'dev' : sduiEnvOverride === 'dev' ? 'prod' : 'auto';
                  setSDUIEnvOverride(next);
                }}
                style={styles.pillToggle}
              >
                <Text style={styles.pillToggleText}>{sduiEnvOverride.toUpperCase()}</Text>
              </Pressable>
            }
          />
          <SettingRow
            icon="refresh-outline"
            iconBg={Colors.systemGreen}
            label="Sync Remote UI"
            sublabel={sduiLastFetched ? `Last synced: ${new Date(sduiLastFetched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not yet synced from server'}
            onPress={async () => {
              hapticLight();
              const ok = await syncSDUI();
              if (ok) {
                Alert.alert('UI Synced', 'Successfully fetched latest UI configuration from server.');
              } else {
                Alert.alert('Server Unreachable', 'Could not reach server at https://www.cruxel.xyz/oryn. Operating seamlessly from local cache.');
              }
            }}
            showChevron
          />
          <SettingRow
            icon="trash-outline"
            iconBg={Colors.systemOrange}
            label="Reset UI to Defaults"
            sublabel="Clears cached remote manifest & restores defaults"
            onPress={() => {
              hapticLight();
              clearSDUICache();
              Alert.alert('SDUI Cache Cleared', 'Remote UI manifest has been reset to defaults.');
            }}
            destructive
          />
        </Section>

        {/* About & Developer */}
        <Section title="About & Developer">
          <SettingRow
            icon="code-slash-outline"
            iconBg={Colors.systemBlue}
            label="About Oryn & Developer"
            sublabel="Maddy · IIITDM Kancheepuram · What is Oryn"
            onPress={() => {
              hapticLight();
              setShowAboutModal(true);
            }}
            showChevron
          />
          <SettingRow
            icon="information-circle-outline"
            iconBg={Colors.systemGray}
            label="Version"
            right={<Text style={styles.valueText}>1.1.0</Text>}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            iconBg={Colors.systemTeal}
            label="Privacy"
            sublabel="All processing happens on-device. No data leaves your phone."
          />
          <SettingRow
            icon="reload-circle-outline"
            iconBg={Colors.systemIndigo}
            label="Replay onboarding"
            sublabel="See the app introduction again"
            onPress={() => {
              hapticLight();
              useOnboardingStore.getState().resetOnboarding();
              Alert.alert('Onboarding Reset', 'Restart the app to see the onboarding again.');
            }}
            showChevron
          />
        </Section>
      </ScrollView>

      <PreferredSendersModal
        visible={showPreferredModal}
        onClose={() => setShowPreferredModal(false)}
      />

      <AcademicProfileModal
        visible={showAcademicModal}
        onClose={() => setShowAcademicModal(false)}
        onOpenTimetable={() => setShowTimetableModal(true)}
      />

      <TimetableModal
        visible={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
        onOpenProfileSettings={() => setShowAcademicModal(true)}
      />

      <AboutDeveloperModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      <NotificationPreferencesModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[6],
    gap: Spacing[5],
  },
  headerWithLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[1],
  },
  pageTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
  },
  section: {
    gap: Spacing[2],
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.widest,
    paddingLeft: Spacing[2],
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[3],
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowPressed: {
    backgroundColor: Colors.cardHover,
  },
  rowLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: Typography.size.base,
    color: Colors.text,
    fontWeight: Typography.weight.regular,
  },
  rowSublabel: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: Spacing[2],
  },
  destructive: {
    color: Colors.systemRed,
  },
  valueText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  accountName: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  accountEmail: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  pillToggle: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderMuted,
  },
  pillToggleText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemBlue,
  },
  themePillToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(175, 82, 222, 0.15)',
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(175, 82, 222, 0.35)',
  },
  themePillToggleMono: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.borderMuted,
  },
  themePillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  themePillTextMono: {
    color: Colors.text,
  },
});
