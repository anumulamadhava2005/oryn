/**
 * RoomLocatorModal — Interactive Campus Lecture Hall & Lab Locator
 * Allows students to look up any hall or lab code (e.g. H25, L509, H01)
 * and view the exact building, floor level, landmarks, and walking directions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { resolveRoomLocation, CampusRoomInfo } from '@/constants/campusMapData';
import { hapticLight } from '@/utils/haptics';

interface RoomLocatorModalProps {
  visible: boolean;
  initialRoomCode?: string | null;
  onClose: () => void;
}

const POPULAR_ROOMS = ['H01', 'H15', 'H21', 'H25', 'H31', 'H42', 'L209', 'L509', 'L512', 'L515'];

export function RoomLocatorModal({
  visible,
  initialRoomCode,
  onClose,
}: RoomLocatorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Sync initial room code
  useEffect(() => {
    if (visible) {
      setSearchQuery(initialRoomCode || 'H25');
    }
  }, [visible, initialRoomCode]);

  const resolvedRooms = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return resolveRoomLocation(q);
  }, [searchQuery]);

  const handleSelectQuickRoom = (code: string) => {
    hapticLight();
    setSearchQuery(code);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBox}>
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Campus Room & Lab Locator</Text>
              <Text style={styles.headerSubtitle}>IIITDM Kancheepuram Academic Zone</Text>
            </View>
          </View>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressedScale]} hitSlop={8}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Hall or Lab (e.g. H25, L509, H01)..."
              placeholderTextColor="#71717A"
              style={styles.searchInput}
              autoCapitalize="characters"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Quick Hall Selector Chips */}
          <View style={styles.quickChipsWrap}>
            <Text style={styles.quickChipsLabel}>QUICK HALLS:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {POPULAR_ROOMS.map(code => {
                const isSelected = searchQuery.toUpperCase().includes(code);
                return (
                  <Pressable
                    key={code}
                    onPress={() => handleSelectQuickRoom(code)}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{code}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Location Results Cards */}
          {resolvedRooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="location-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Enter a room code to view directions</Text>
              <Text style={styles.emptySub}>
                Type e.g. "H25" for Lecture Hall 25 or "L509" for Software Lab 509.
              </Text>
            </View>
          ) : (
            resolvedRooms.map((room, idx) => (
              <View key={`${room.code}-${idx}`} style={styles.roomCard}>
                {/* Top Badge Row */}
                <View style={styles.roomHeaderRow}>
                  <View style={styles.roomCodeBox}>
                    <Text style={styles.roomCodeText}>{room.code}</Text>
                  </View>

                  <View style={styles.roomMetaCol}>
                    <Text style={styles.buildingName}>{room.building}</Text>
                    <View style={styles.metaPillsRow}>
                      <View style={styles.floorPill}>
                        <Ionicons name="layers-outline" size={11} color={Colors.systemBlue} />
                        <Text style={styles.floorPillText}>{room.floor}</Text>
                      </View>
                      <View style={styles.typePill}>
                        <Ionicons
                          name={room.type === 'Lecture Hall' ? 'school-outline' : 'hardware-chip-outline'}
                          size={11}
                          color={Colors.systemOrange}
                        />
                        <Text style={styles.typePillText}>{room.type}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Visual Floor Level Visualizer */}
                <View style={styles.floorLevelBox}>
                  <Text style={styles.floorLevelLabel}>BUILDING ELEVATION</Text>
                  <View style={styles.floorLevelsGrid}>
                    {[0, 1, 2, 3, 4, 5].map(lvl => {
                      const isThisFloor = room.floorNumber === lvl;
                      return (
                        <View
                          key={lvl}
                          style={[
                            styles.floorLevelStep,
                            isThisFloor && styles.floorLevelStepActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.floorLevelStepText,
                              isThisFloor && styles.floorLevelStepTextActive,
                            ]}
                          >
                            {lvl === 0 ? 'GF' : `F${lvl}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Walking Directions & Navigation Cues */}
                <View style={styles.directionsSection}>
                  <View style={styles.directionsTitleRow}>
                    <Ionicons name="footsteps-outline" size={14} color={Colors.systemGreen} />
                    <Text style={styles.directionsTitle}>HOW TO GET THERE</Text>
                  </View>
                  <Text style={styles.directionsBody}>{room.directions}</Text>
                </View>

                {/* Landmarks Info */}
                <View style={styles.landmarksSection}>
                  <Ionicons name="pin-outline" size={13} color={Colors.systemBlue} />
                  <Text style={styles.landmarksText}>{room.landmarks}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedScale: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  content: {
    padding: Spacing[4],
    gap: Spacing[4],
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2.5],
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2.5],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: Typography.weight.medium,
  },
  quickChipsWrap: {
    gap: Spacing[2],
  },
  quickChipsLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  chipsScroll: {
    gap: 6,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipSelected: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  chipText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#A1A1AA',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  roomCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  roomHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  roomCodeBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCodeText: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  roomMetaCol: {
    flex: 1,
    gap: 4,
  },
  buildingName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  metaPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  floorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  floorPillText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
  },
  floorLevelBox: {
    backgroundColor: '#18181A',
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[2],
  },
  floorLevelLabel: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  floorLevelsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  floorLevelStep: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorLevelStepActive: {
    backgroundColor: Colors.systemBlue,
  },
  floorLevelStepText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#71717A',
  },
  floorLevelStepTextActive: {
    color: '#FFFFFF',
  },
  directionsSection: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: 4,
  },
  directionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  directionsTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemGreen,
    letterSpacing: 0.5,
  },
  directionsBody: {
    fontSize: 12,
    color: '#D4D4D8',
    lineHeight: 18,
  },
  landmarksSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[1],
  },
  landmarksText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  emptySub: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
