/**
 * DateTimePickerModal — Apple HIG / Oryn Dark Themed Date & Time Picker.
 * Provides an interactive calendar grid, 12-hour AM/PM time selector,
 * optional end time selection, and quick campus presets without native dependencies.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfToday,
  addDays,
  setHours,
  setMinutes,
} from 'date-fns';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import { CircularClockPicker } from './CircularClockPicker';

interface DateTimePickerModalProps {
  visible: boolean;
  initialDate?: Date;
  initialEndDate?: Date | null;
  onClose: () => void;
  onConfirm: (startDate: Date, endDate?: Date | null) => void;
}

type PickerTab = 'date' | 'start_time' | 'end_time';

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const COMMON_MINUTES = [0, 15, 30, 45];

export function DateTimePickerModal({
  visible,
  initialDate,
  initialEndDate,
  onClose,
  onConfirm,
}: DateTimePickerModalProps) {
  const insets = useSafeAreaInsets();

  // Internal state
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate || addDays(new Date(), 1));
  const [currentMonth, setCurrentMonth] = useState<Date>(() => initialDate || new Date());
  const [activeTab, setActiveTab] = useState<PickerTab>('date');

  // Start Time state
  const [startHour12, setStartHour12] = useState<number>(() => {
    const d = initialDate || new Date();
    const h24 = d.getHours();
    return h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  });
  const [startMinute, setStartMinute] = useState<number>(() => {
    const m = (initialDate || new Date()).getMinutes();
    return Math.round(m / 5) * 5 % 60;
  });
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>(() => {
    const h24 = (initialDate || new Date()).getHours();
    return h24 >= 12 ? 'PM' : 'AM';
  });

  // End Time state (optional)
  const [hasEndTime, setHasEndTime] = useState<boolean>(() => Boolean(initialEndDate));
  const [endHour12, setEndHour12] = useState<number>(() => {
    const d = initialEndDate || (initialDate ? addDays(initialDate, 0) : new Date());
    const h24 = (d.getHours() + 2) % 24;
    return h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  });
  const [endMinute, setEndMinute] = useState<number>(() => {
    const m = (initialEndDate || new Date()).getMinutes();
    return Math.round(m / 5) * 5 % 60;
  });
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>(() => {
    const d = initialEndDate || new Date();
    const h24 = (d.getHours() + 2) % 24;
    return h24 >= 12 ? 'PM' : 'AM';
  });

  const today = startOfToday();

  // Calendar days computation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Combine date and time
  const computedStartDate = useMemo(() => {
    let h24 = startHour12 % 12;
    if (startAmPm === 'PM') h24 += 12;
    return setMinutes(setHours(selectedDate, h24), startMinute);
  }, [selectedDate, startHour12, startMinute, startAmPm]);

  const computedEndDate = useMemo(() => {
    if (!hasEndTime) return null;
    let h24 = endHour12 % 12;
    if (endAmPm === 'PM') h24 += 12;
    let end = setMinutes(setHours(selectedDate, h24), endMinute);
    // If end time is earlier in the day than start time, assume it ends next day or later
    if (isBefore(end, computedStartDate)) {
      end = addDays(end, 1);
    }
    return end;
  }, [selectedDate, endHour12, endMinute, endAmPm, hasEndTime, computedStartDate]);

  const handlePrevMonth = () => {
    hapticLight();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    hapticLight();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleSelectDay = (day: Date) => {
    hapticLight();
    console.log('[DateTimePicker] selected day:', day);
    setSelectedDate(day);
  };

  // Quick Presets
  const applyPreset = (daysFromNow: number, hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    hapticLight();
    console.log('[DateTimePicker] applyPreset daysFromNow:', daysFromNow);
    const target = addDays(new Date(), daysFromNow);
    setSelectedDate(target);
    setCurrentMonth(target);
    setStartHour12(hour12);
    setStartMinute(minute);
    setStartAmPm(ampm);
  };

  const handleSave = () => {
    hapticSuccess();
    console.log('[DateTimePicker] handleSave called! Start:', computedStartDate, 'End:', computedEndDate);
    onConfirm(computedStartDate, computedEndDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="calendar" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Select Event Date & Time</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Current Selection Overview Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryDot} />
              <Text style={styles.summaryDateText}>
                {format(computedStartDate, 'EEEE, d MMMM yyyy')}
              </Text>
            </View>
            <View style={styles.summaryTimeRow}>
              <Ionicons name="time-outline" size={15} color={Colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.summaryTimeText}>
                {format(computedStartDate, 'hh:mm a')}
                {computedEndDate ? ` – ${format(computedEndDate, 'hh:mm a')}` : ' onwards'}
              </Text>
            </View>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabsRow}>
            <Pressable
              style={[styles.tabBtn, activeTab === 'date' && styles.tabBtnActive]}
              onPress={() => {
                hapticLight();
                setActiveTab('date');
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={activeTab === 'date' ? '#000000' : Colors.text}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, activeTab === 'date' && styles.tabTextActive]}>
                1. Date
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'start_time' && styles.tabBtnActive]}
              onPress={() => {
                hapticLight();
                setActiveTab('start_time');
              }}
            >
              <Ionicons
                name="time-outline"
                size={14}
                color={activeTab === 'start_time' ? '#000000' : Colors.text}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, activeTab === 'start_time' && styles.tabTextActive]}>
                2. Start Time
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'end_time' && styles.tabBtnActive]}
              onPress={() => {
                hapticLight();
                setActiveTab('end_time');
                if (!hasEndTime) setHasEndTime(true);
              }}
            >
              <Ionicons
                name="hourglass-outline"
                size={14}
                color={activeTab === 'end_time' ? '#000000' : Colors.text}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, activeTab === 'end_time' && styles.tabTextActive]}>
                3. End Time
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* ── TAB 1: DATE CALENDAR ── */}
            {activeTab === 'date' && (
              <View style={styles.tabContent}>
                {/* Month Navigation */}
                <View style={styles.monthNavRow}>
                  <Pressable style={styles.monthArrowBtn} onPress={handlePrevMonth} hitSlop={8}>
                    <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
                  </Pressable>

                  <Text style={styles.monthTitleText}>
                    {format(currentMonth, 'MMMM yyyy')}
                  </Text>

                  <Pressable style={styles.monthArrowBtn} onPress={handleNextMonth} hitSlop={8}>
                    <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>

                {/* Day of Week Headers */}
                <View style={styles.weekHeadersRow}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, idx) => (
                    <Text key={idx} style={styles.weekHeaderText}>{d}</Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, idx) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isPast = isBefore(day, today);
                    const isTodayDay = isSameDay(day, today);

                    return (
                      <Pressable
                        key={idx}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                          isTodayDay && !isSelected && styles.dayCellToday,
                        ]}
                        disabled={isPast}
                        onPress={() => handleSelectDay(day)}
                      >
                        <Text
                          style={[
                            styles.dayCellText,
                            !isCurrentMonth && styles.dayCellOtherMonth,
                            isPast && styles.dayCellPast,
                            isSelected && styles.dayCellTextSelected,
                          ]}
                        >
                          {format(day, 'd')}
                        </Text>
                        {isTodayDay && !isSelected && (
                          <View style={styles.todayIndicatorDot} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Quick Date Presets */}
                <View style={styles.presetsSection}>
                  <Text style={styles.presetsLabel}>QUICK CAMPUS PRESETS</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsRow}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    <Pressable
                      style={styles.presetChip}
                      onPress={() => applyPreset(0, 5, 0, 'PM')}
                    >
                      <Text style={styles.presetChipText}>Today 5:00 PM</Text>
                    </Pressable>
                    <Pressable
                      style={styles.presetChip}
                      onPress={() => applyPreset(1, 10, 0, 'AM')}
                    >
                      <Text style={styles.presetChipText}>Tomorrow 10:00 AM</Text>
                    </Pressable>
                    <Pressable
                      style={styles.presetChip}
                      onPress={() => applyPreset(1, 6, 0, 'PM')}
                    >
                      <Text style={styles.presetChipText}>Tomorrow 6:00 PM</Text>
                    </Pressable>
                    <Pressable
                      style={styles.presetChip}
                      onPress={() => applyPreset(2, 2, 0, 'PM')}
                    >
                      <Text style={styles.presetChipText}>In 2 Days</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              </View>
            )}

            {/* ── TAB 2: START TIME ── */}
            {activeTab === 'start_time' && (
              <View style={styles.tabContent}>
                <CircularClockPicker
                  hour12={startHour12}
                  minute={startMinute}
                  ampm={startAmPm}
                  onChange={(h, m, ap) => {
                    setStartHour12(h);
                    setStartMinute(m);
                    setStartAmPm(ap);
                  }}
                />
              </View>
            )}

            {/* ── TAB 3: END TIME ── */}
            {activeTab === 'end_time' && (
              <View style={styles.tabContent}>
                {/* Optional Toggle */}
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>Set Event End Time</Text>
                    <Text style={styles.toggleSub}>
                      Helps students plan their calendar and know when sessions conclude.
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.switchTrack, hasEndTime && styles.switchTrackActive]}
                    onPress={() => {
                      hapticLight();
                      setHasEndTime(!hasEndTime);
                    }}
                  >
                    <View style={[styles.switchThumb, hasEndTime && styles.switchThumbActive]} />
                  </Pressable>
                </View>

                {hasEndTime && (
                  <CircularClockPicker
                    hour12={endHour12}
                    minute={endMinute}
                    ampm={endAmPm}
                    onChange={(h, m, ap) => {
                      setEndHour12(h);
                      setEndMinute(m);
                      setEndAmPm(ap);
                    }}
                  />
                )}
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Buttons */}
          <View style={styles.footerActions}>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85 }]}
              onPress={handleSave}
              hitSlop={12}
            >
              <Ionicons name="checkmark-sharp" size={17} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>Confirm Date & Time</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  sheetContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxHeight: '88%',
    paddingTop: Spacing[4],
    paddingHorizontal: Spacing[4],
    zIndex: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing[3],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  summaryDateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: Radius.full,
    padding: 3,
    marginBottom: Spacing[3],
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  bodyScroll: {
    maxHeight: 380,
  },
  tabContent: {
    paddingBottom: Spacing[3],
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
    paddingHorizontal: Spacing[1],
  },
  monthArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weekHeadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing[1.5],
  },
  weekHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    width: 38,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: Spacing[3],
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#FFFFFF',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  todayIndicatorDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dayCellTextSelected: {
    color: '#000000',
    fontWeight: '800',
  },
  dayCellOtherMonth: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  dayCellPast: {
    color: 'rgba(255, 255, 255, 0.15)',
  },
  presetsSection: {
    marginTop: Spacing[1],
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing[2],
  },
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: Spacing[3],
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeDisplayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.lg,
    padding: Spacing[3.5],
    alignItems: 'center',
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timeDisplayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timeDisplayDigits: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  timeDisplayAmPm: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accent,
  },
  ampmRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  ampmBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ampmBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  ampmText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  ampmTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  sectionSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing[2],
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  numberCell: {
    width: '14%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  numberCellActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  numberCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  numberCellTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  minutesRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  minutePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  minutePillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  minutePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  minutePillTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing[3],
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#10B981',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    transform: [{ translateX: 18 }],
  },
  footerActions: {
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 20,
    elevation: 12,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: Radius.full,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
});
