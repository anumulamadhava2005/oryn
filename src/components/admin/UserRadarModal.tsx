/**
 * User Radar Modal — Bird's Eye View of all installed devices and active users.
 * Apple HIG-inspired dashboard for Super Admin (cs23b1008@iiitdm.ac.in).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { fetchTelemetryOverview, getCachedTelemetryOverview } from '@/services/telemetryService';
import type { TelemetryOverview, TelemetryDevice } from '@/types/telemetry';
import { hapticLight, hapticMedium } from '@/utils/haptics';

interface UserRadarModalProps {
  visible: boolean;
  onClose: () => void;
}

type FilterScope = 'all' | 'online' | 'today' | '2023' | '2025' | '2026';

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const time = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function UserRadarModal({ visible, onClose }: UserRadarModalProps) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<TelemetryOverview | null>(() => getCachedTelemetryOverview());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterScope>('all');
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchTelemetryOverview();
      if (res && res.devices) {
        setData(res);
        setError(null);
      } else {
        const cached = getCachedTelemetryOverview();
        if (cached) {
          setData(cached);
        } else {
          setError('Could not reach the telemetry server. Check network or tap Refresh.');
        }
      }
    } catch (err: any) {
      const cached = getCachedTelemetryOverview();
      if (cached) {
        setData(cached);
      } else {
        setError(err?.message || 'Network error fetching telemetry');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const summary = data?.summary;

  const filteredDevices = useMemo(() => {
    if (!data?.devices) return [];
    let list = data.devices;

    // Filter scope
    if (activeFilter === 'online') {
      list = list.filter((d) => d.is_online);
    } else if (activeFilter === 'today') {
      list = list.filter((d) => d.is_active_today);
    } else if (activeFilter === '2023' || activeFilter === '2025' || activeFilter === '2026') {
      list = list.filter((d) => d.batch === activeFilter);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (d) =>
          (d.user_name && d.user_name.toLowerCase().includes(q)) ||
          (d.roll_number && d.roll_number.toLowerCase().includes(q)) ||
          (d.user_email && d.user_email.toLowerCase().includes(q)) ||
          (d.device_model && d.device_model.toLowerCase().includes(q)) ||
          (d.department && d.department.toLowerCase().includes(q))
      );
    }

    return list;
  }, [data, activeFilter, search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 12 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Ionicons name="radio-outline" size={20} color={Colors.systemTeal} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Bird's Eye View</Text>
              <Text style={styles.headerSubtitle}>Real-time installed devices & active users</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => {
                hapticLight();
                loadData(true);
              }}
              style={styles.actionBtn}
              accessibilityLabel="Refresh Data"
            >
              <Ionicons name="refresh" size={18} color={Colors.text} />
            </Pressable>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Live Pulse Indicator */}
        <View style={[styles.pulseBar, error ? styles.pulseBarOffline : null]}>
          <View style={[styles.pulseDot, error ? styles.pulseDotOffline : null]} />
          <Text style={[styles.pulseText, error ? styles.pulseTextOffline : null]}>
            {error
              ? 'Telemetry offline · Showing cached device snapshot'
              : `Telemetry active · ${summary?.activeNow ?? 0} devices live right now`}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={Colors.systemTeal}
            />
          }
        >
          {/* Summary Metric Cards */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <Ionicons name="phone-portrait-outline" size={15} color={Colors.systemBlue} />
                <Text style={styles.kpiLabel}>Total Installs</Text>
              </View>
              <Text style={styles.kpiValue}>{summary?.totalInstalls ?? '—'}</Text>
              <Text style={styles.kpiSub}>Registered devices</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <Ionicons name="flame-outline" size={15} color={Colors.systemOrange} />
                <Text style={styles.kpiLabel}>Active Today</Text>
              </View>
              <Text style={styles.kpiValue}>{summary?.activeToday ?? '—'}</Text>
              <Text style={styles.kpiSub}>Last 24 hours</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <Ionicons name="pulse" size={15} color={Colors.systemGreen} />
                <Text style={styles.kpiLabel}>Online Now</Text>
              </View>
              <Text style={[styles.kpiValue, { color: Colors.systemGreen }]}>
                {summary?.activeNow ?? '—'}
              </Text>
              <Text style={styles.kpiSub}>Within 15 min</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <Ionicons name="people-outline" size={15} color={Colors.systemPurple} />
                <Text style={styles.kpiLabel}>Identified</Text>
              </View>
              <Text style={styles.kpiValue}>{summary?.registeredUsers ?? '—'}</Text>
              <Text style={styles.kpiSub}>Campus students</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <Ionicons name="notifications-outline" size={15} color={Colors.systemTeal} />
                <Text style={styles.kpiLabel}>Push Ready</Text>
              </View>
              <Text style={[styles.kpiValue, { color: Colors.systemTeal }]}>
                {summary?.withPushTokens ?? data?.devices?.filter((d) => !!d.expo_push_token).length ?? 0}
              </Text>
              <Text style={styles.kpiSub}>Active push tokens</Text>
            </View>
          </View>

          {/* Batch Breakdown Pills */}
          {data?.batches && Object.keys(data.batches).length > 0 && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionHeader}>Batch Breakdown</Text>
              <View style={styles.batchPillsWrap}>
                {Object.entries(data.batches).map(([batch, count]) => {
                  const isSelected = activeFilter === batch;
                  return (
                    <Pressable
                      key={batch}
                      onPress={() => {
                        hapticLight();
                        setActiveFilter(isSelected ? 'all' : (batch as FilterScope));
                      }}
                      style={[styles.batchPill, isSelected && styles.batchPillActive]}
                    >
                      <Text style={[styles.batchPillLabel, isSelected && styles.batchPillLabelActive]}>
                        Batch of {batch}
                      </Text>
                      <View style={[styles.batchBadge, isSelected && styles.batchBadgeActive]}>
                        <Text style={[styles.batchBadgeText, isSelected && styles.batchBadgeTextActive]}>
                          {count}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={15} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by student, roll number, device..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
            <Pressable
              onPress={() => {
                hapticLight();
                setActiveFilter('all');
              }}
              style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
                All Devices ({data?.devices?.length ?? 0})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                setActiveFilter('online');
              }}
              style={[styles.filterPill, activeFilter === 'online' && styles.filterPillActive]}
            >
              <Ionicons
                name="ellipse"
                size={8}
                color={activeFilter === 'online' ? Colors.white : Colors.systemGreen}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.filterPillText, activeFilter === 'online' && styles.filterPillTextActive]}>
                Live Now ({summary?.activeNow ?? 0})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                setActiveFilter('today');
              }}
              style={[styles.filterPill, activeFilter === 'today' && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, activeFilter === 'today' && styles.filterPillTextActive]}>
                Active Today ({summary?.activeToday ?? 0})
              </Text>
            </Pressable>
          </ScrollView>

          {/* Device & User Cards Roster */}
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterTitle}>
              Installed Devices ({filteredDevices.length})
            </Text>
            <Text style={styles.rosterSubtitle}>Sorted by most recent activity</Text>
          </View>

          {loading && !refreshing && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={Colors.systemTeal} />
              <Text style={styles.loadingText}>Fetching active telemetry...</Text>
            </View>
          )}

          {filteredDevices.map((item) => {
            const initials = (item.user_name || item.roll_number || 'O')
              .split(' ')
              .map((w) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <View key={item.device_id} style={styles.deviceCard}>
                <View style={styles.cardTop}>
                  {/* Avatar */}
                  <View style={styles.avatarWrap}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                    )}
                    {item.is_online && <View style={styles.onlineBadge} />}
                  </View>

                  {/* Name and Roll Number */}
                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.user_name || 'Guest Device'}
                      </Text>
                      {item.is_online ? (
                        <View style={styles.liveTag}>
                          <Text style={styles.liveTagText}>LIVE</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.userEmail} numberOfLines={1}>
                      {item.user_email || 'Unauthenticated Installation'}
                    </Text>

                    {/* Metadata tags */}
                    <View style={styles.tagRow}>
                      {item.roll_number ? (
                        <View style={styles.rollBadge}>
                          <Text style={styles.rollBadgeText}>{item.roll_number}</Text>
                        </View>
                      ) : null}
                      {item.batch && item.batch !== 'Unknown' ? (
                        <View style={styles.batchTag}>
                          <Text style={styles.batchTagText}>'{item.batch.slice(2)}</Text>
                        </View>
                      ) : null}
                      {item.department ? (
                        <View style={styles.deptTag}>
                          <Text style={styles.deptTagText}>{item.department}</Text>
                        </View>
                      ) : null}
                      {item.expo_push_token ? (
                        <View style={styles.pushTag}>
                          <Ionicons name="notifications" size={10} color="#34C759" />
                          <Text style={styles.pushTagText}>Push Ready</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Device Details Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerCol}>
                    <View style={styles.detailRow}>
                      <Ionicons name="hardware-chip-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {item.device_model || 'Android Device'} {item.os_version ? `(Android ${item.os_version})` : ''}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="git-commit-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.detailText}>
                        v{item.app_version || '1.1.0'} · {item.launch_count} {item.launch_count === 1 ? 'launch' : 'launches'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.footerTimeCol}>
                    <Text style={styles.lastSeenLabel}>Last Active</Text>
                    <Text style={styles.lastSeenVal}>{formatRelativeTime(item.last_seen)}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {filteredDevices.length === 0 && !loading && (
            error ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="cloud-offline-outline" size={38} color={Colors.systemOrange} />
                <Text style={styles.emptyTitle}>Could not connect</Text>
                <Text style={styles.emptySubtitle}>{error}</Text>
                <Pressable
                  onPress={() => {
                    hapticLight();
                    loadData(true);
                  }}
                  style={styles.retryBtn}
                >
                  <Ionicons name="refresh" size={15} color="#000" />
                  <Text style={styles.retryBtnText}>Retry Connection</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No matching devices</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search query or active filter.</Text>
              </View>
            )
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(48, 176, 199, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.md,
    color: Colors.text,
    fontWeight: Typography.weight.bold,
  },
  headerSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(52, 199, 89, 0.2)',
  },
  pulseBarOffline: {
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderBottomColor: 'rgba(255, 149, 0, 0.2)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.systemGreen,
    marginRight: 8,
  },
  pulseDotOffline: {
    backgroundColor: Colors.systemOrange,
  },
  pulseText: {
    fontSize: Typography.size.xs,
    color: Colors.systemGreen,
    fontWeight: Typography.weight.semibold,
  },
  pulseTextOffline: {
    color: Colors.systemOrange,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.lg,
    padding: 12,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: Typography.weight.semibold,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: Typography.size['2xl'],
    color: Colors.text,
    fontWeight: Typography.weight.bold,
    letterSpacing: -0.5,
  },
  kpiSub: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionWrap: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  batchPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  batchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 6,
    gap: 6,
  },
  batchPillActive: {
    backgroundColor: 'rgba(48, 176, 199, 0.18)',
    borderColor: Colors.systemTeal,
  },
  batchPillLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text,
    fontWeight: Typography.weight.medium,
  },
  batchPillLabelActive: {
    color: Colors.systemTeal,
    fontWeight: Typography.weight.bold,
  },
  batchBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  batchBadgeActive: {
    backgroundColor: Colors.systemTeal,
  },
  batchBadgeText: {
    fontSize: 10,
    color: Colors.text,
    fontWeight: Typography.weight.bold,
  },
  batchBadgeTextActive: {
    color: '#000',
    fontWeight: Typography.weight.bold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterPillActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  filterPillText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.semibold,
  },
  filterPillTextActive: {
    color: '#000',
    fontWeight: Typography.weight.bold,
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rosterTitle: {
    fontSize: Typography.size.base,
    color: Colors.text,
    fontWeight: Typography.weight.bold,
  },
  rosterSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  deviceCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarText: {
    fontSize: Typography.size.sm,
    color: Colors.text,
    fontWeight: Typography.weight.bold,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.systemGreen,
    borderWidth: 2,
    borderColor: '#0A0A0C',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  userName: {
    fontSize: Typography.size.sm,
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
    flex: 1,
  },
  liveTag: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.systemGreen,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  rollBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  rollBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  batchTag: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  batchTagText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
  },
  deptTag: {
    backgroundColor: 'rgba(175, 82, 222, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  deptTagText: {
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    color: Colors.systemPurple,
  },
  pushTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  pushTagText: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
    color: '#34C759',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    marginTop: 8,
    paddingTop: 8,
  },
  footerCol: {
    flex: 1,
    gap: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  footerTimeCol: {
    alignItems: 'flex-end',
  },
  lastSeenLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  lastSeenVal: {
    fontSize: Typography.size.xs,
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  emptyWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: Typography.size.base,
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.systemTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    marginTop: 12,
  },
  retryBtnText: {
    fontSize: Typography.size.xs,
    color: '#000',
    fontWeight: Typography.weight.bold,
  },
});
