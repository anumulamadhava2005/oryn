/**
 * Super Admin Hub Modal — Exclusive governance center
 * for cs23b1008@iiitdm.ac.in to review and approve/reject club page requests.
 * Refactored to Apple HIG standards: calm dark palette, vector icons, and clear typography.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useEventsStore } from '@/store/eventsStore';
import type { ClubRequest } from '@/types/events';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

interface AdminHubModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AdminHubModal({ visible, onClose }: AdminHubModalProps) {
  const insets = useSafeAreaInsets();
  const adminClubRequests = useEventsStore((s) => s.adminClubRequests);
  const isAdminLoading = useEventsStore((s) => s.isAdminLoading);
  const isSubmitting = useEventsStore((s) => s.isSubmitting);
  const loadAdminRequests = useEventsStore((s) => s.loadAdminRequests);
  const approveRequest = useEventsStore((s) => s.approveRequest);
  const rejectRequest = useEventsStore((s) => s.rejectRequest);

  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');

  useEffect(() => {
    if (visible) {
      loadAdminRequests();
    }
  }, [visible, loadAdminRequests]);

  const pendingRequests = adminClubRequests.filter((r) => r.status === 'pending');
  const reviewedRequests = adminClubRequests.filter((r) => r.status !== 'pending');

  const handleApprove = (req: ClubRequest) => {
    Alert.alert(
      'Approve Club Request',
      `Approve "${req.club_name}" and grant Club Lead Studio access to ${req.lead_email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              hapticSuccess();
              await approveRequest(req.id);
              Alert.alert('Approved', `"${req.club_name}" is now live on campus.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to approve club.');
            }
          },
        },
      ]
    );
  };

  const handleReject = (req: ClubRequest) => {
    Alert.alert(
      'Reject Request',
      `Decline club application for "${req.club_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              hapticLight();
              await rejectRequest(req.id, 'Does not meet current campus guidelines.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject request.');
            }
          },
        },
      ]
    );
  };

  const displayedRequests = activeTab === 'pending' ? pendingRequests : reviewedRequests;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: '80%', paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Grabber */}
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark-outline" size={13} color={Colors.accent} />
              <Text style={styles.adminBadgeText}>SUPER ADMIN</Text>
            </View>
            <Text style={styles.title}>Club Approvals</Text>
            <Text style={styles.adminEmail}>cs23b1008@iiitdm.ac.in</Text>
          </View>
          <Pressable
            style={styles.closeBtn}
            onPress={() => {
              hapticLight();
              onClose();
            }}
            hitSlop={8}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Segmented Tab Switcher */}
        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => {
              hapticLight();
              setActiveTab('pending');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending ({pendingRequests.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'reviewed' && styles.tabActive]}
            onPress={() => {
              hapticLight();
              setActiveTab('reviewed');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'reviewed' && styles.tabTextActive]}>
              History ({reviewedRequests.length})
            </Text>
          </Pressable>
        </View>

        {/* Requests List */}
        {isAdminLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.loadingText}>Fetching applications...</Text>
          </View>
        ) : displayedRequests.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'pending'
                ? 'No pending club creation requests at the moment.'
                : 'No historical reviewed requests found.'}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {displayedRequests.map((req) => {
              const isPending = req.status === 'pending';

              return (
                <View key={req.id} style={styles.requestCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clubName}>{req.club_name}</Text>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{req.category}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        req.status === 'approved'
                          ? styles.statusApproved
                          : req.status === 'rejected'
                          ? styles.statusRejected
                          : styles.statusPending,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{req.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  {/* Applicant Details Box */}
                  <View style={styles.applicantBox}>
                    <View style={styles.applicantRow}>
                      <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.applicantText}>
                        Lead: <Text style={styles.boldText}>{req.lead_name}</Text> ({req.lead_email})
                      </Text>
                    </View>

                    {req.contact_phone && (
                      <View style={styles.applicantRow}>
                        <Ionicons name="call-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.applicantText}>{req.contact_phone}</Text>
                      </View>
                    )}

                    {req.instagram_handle && (
                      <View style={styles.applicantRow}>
                        <Ionicons name="logo-instagram" size={13} color={Colors.textMuted} />
                        <Text style={styles.applicantText}>@{req.instagram_handle.replace('@', '')}</Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  <Text style={styles.descriptionText}>{req.description}</Text>

                  {/* Approval Actions */}
                  {isPending && (
                    <View style={styles.actionsRow}>
                      <Pressable
                        style={[styles.actionBtn, styles.approveBtn]}
                        disabled={isSubmitting}
                        onPress={() => handleApprove(req)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color={Colors.accent} />
                        <Text style={[styles.actionBtnText, { color: Colors.accent }]}>Approve</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionBtn, styles.rejectBtn]}
                        disabled={isSubmitting}
                        onPress={() => handleReject(req)}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={Colors.systemRed} />
                        <Text style={[styles.actionBtnText, { color: Colors.systemRed }]}>Decline</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHigh,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentFaded,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.accentFadedBorder,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.accent,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  adminEmail: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  tabText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weight.medium,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  listContent: {
    padding: Spacing[4],
    gap: Spacing[3.5],
    paddingBottom: 40,
  },
  requestCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  clubName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  categoryPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  statusPending: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  statusApproved: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  statusRejected: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  applicantBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
  },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applicantText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  boldText: {
    color: Colors.text,
    fontWeight: Typography.weight.semibold,
  },
  descriptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing[3],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderMuted,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  approveBtn: {
    backgroundColor: Colors.accentFaded,
    borderColor: Colors.accentFadedBorder,
  },
  rejectBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
  },
});
