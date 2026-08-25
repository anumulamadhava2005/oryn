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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useEmails } from '@/hooks/useEmails';
import { SyncStatus } from '@/components/common/SyncStatus';
import { clearAllCache } from '@/services/cache';
import { hapticLight } from '@/utils/haptics';
import { useEmailsStore, type EmailsStore } from '@/store/emails';
import { useSyncStore, type SyncStore } from '@/store/sync';
import { useOnboardingStore } from '@/store/onboarding';
import { usePreferredSendersStore } from '@/store/preferredSenders';
import { PreferredSendersModal } from '@/components/settings/PreferredSendersModal';
import { useAcademicStore } from '@/store/academicStore';
import { AcademicProfileModal } from '@/components/settings/AcademicProfileModal';
import { TimetableModal } from '@/components/academic/TimetableModal';
import { OrynLogo } from '@/components/common/OrynLogo';
import { syncWidgetData } from '@/services/widgetDataService';

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

  const [showPreferredModal, setShowPreferredModal] = useState(false);
  const [showAcademicModal, setShowAcademicModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);

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

        {/* Preferences */}
        <Section title="Preferences">
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

        {/* About */}
        <Section title="About">
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
            icon="sparkles-outline"
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
    paddingBottom: Spacing[16],
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
});
