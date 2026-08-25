/**
 * widgetDataService.ts — Bridges app data (Timetable, Mess Menu, Category Emails)
 * to native Android widgets via SharedPreferences through OrynWidgetModule.
 *
 * Flow: JS builds payload → writes MMKV + calls NativeModules.OrynWidgetModule.updateWidgetData()
 *       → native Kotlin writes SharedPreferences → broadcasts APPWIDGET_UPDATE to all receivers.
 */

import { NativeModules, Platform } from 'react-native';
import { MESS_MENU, getCurrentMealType, getMealTimeLabel, getWeekType, getDayName, MealType } from '@/constants/messMenu';
import { useEmailsStore } from '@/store/emails';
import { useAcademicStore, doesCourseMatchSlot } from '@/store/academicStore';
import { HIGHER_SEM_SLOTS, FIRST_SEM_SLOTS } from '@/constants/academicData';
import type { ParsedEmail } from '@/types/email';

export interface WidgetAcademicClass {
  id: string;
  code: string;
  title: string;
  slot: string;
  room: string;
  timeSlot: string;
  isLive: boolean;
  isUpcoming: boolean;
}

export interface WidgetAcademicData {
  todayClasses: WidgetAcademicClass[];
  activeClass: WidgetAcademicClass | null;
  nextClass: WidgetAcademicClass | null;
  totalClassesToday: number;
}

export interface WidgetMessData {
  weekType: 'even' | 'odd';
  dayName: string;
  mealType: MealType;
  mealTimeLabel: string;
  main: string[];
  accompaniments: string[];
  beverage?: string;
  dessert?: string;
  extras?: string[];
}

export interface WidgetEmailItem {
  id: string;
  subject: string;
  sender: string;
  senderRole?: string;
  category: string;
  receivedAt: string;
  isUnread: boolean;
  isUrgent: boolean;
  deadlineLabel?: string;
}

export interface WidgetCategoryEmailsData {
  activeCategory: string;
  categories: string[];
  emails: Record<string, WidgetEmailItem[]>;
  unreadCounts: Record<string, number>;
}

export interface OrynWidgetPayload {
  lastUpdated: string;
  academic: WidgetAcademicData;
  mess: WidgetMessData;
  categoryMails: WidgetCategoryEmailsData;
}

export const EMAIL_CATEGORIES = [
  'All',
  'Placements',
  'Academics',
  'Events',
  'Hostel',
  'Administration',
];

const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

/** Map raw ParsedEmail to simplified widget item */
function mapToWidgetEmail(email: ParsedEmail): WidgetEmailItem {
  return {
    id: email.id,
    subject: email.subject,
    sender: email.sender,
    senderRole: email.senderEmail,
    category: email.categoryGroup ? email.categoryGroup.toUpperCase() : 'GENERAL',
    receivedAt: email.date ? new Date(email.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today',
    isUnread: email.isUnread,
    isUrgent: email.priority === 'critical' || email.priority === 'high',
    deadlineLabel: email.deadline ? new Date(email.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' }) : undefined,
  };
}

/**
 * Parse a time slot string like "8:00 - 8:50 AM" into start/end minutes from midnight.
 */
function parseSlotTime(timeSlot: string): { startMin: number; endMin: number } {
  const parts = timeSlot.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!parts) return { startMin: 0, endMin: 0 };
  const period = parts[5]!.toUpperCase();
  let startH = parseInt(parts[1]!, 10);
  const startM = parseInt(parts[2]!, 10);
  let endH = parseInt(parts[3]!, 10);
  const endM = parseInt(parts[4]!, 10);

  // Both times share the same AM/PM marker in slot format
  if (period === 'PM' && startH < 12) startH += 12;
  if (period === 'PM' && endH < 12) endH += 12;
  if (period === 'AM' && startH === 12) startH = 0;
  if (period === 'AM' && endH === 12) endH = 0;

  return { startMin: startH * 60 + startM, endMin: endH * 60 + endM };
}

/** Get live academic timetable payload for today */
export function getWidgetAcademicData(): WidgetAcademicData {
  const store = useAcademicStore.getState();
  const eligibleCourses = store.getEligibleCourses();
  const semester = store.semester;
  const slotMatrix = semester === 'Semester 1' ? FIRST_SEM_SLOTS : HIGHER_SEM_SLOTS;

  const now = new Date();
  const dayIdx = now.getDay(); // 0=Sun
  const dayKey = DAY_KEYS[dayIdx]; // 'MON', 'TUE', etc.
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const classes: WidgetAcademicClass[] = [];

  // Weekdays only (MON–FRI in slot matrix)
  const daySlots = dayKey ? slotMatrix[dayKey] : undefined;
  if (daySlots && eligibleCourses.length > 0) {
    const sortedTimeSlots = Object.entries(daySlots).sort((a, b) => {
      const aTime = parseSlotTime(a[0]);
      const bTime = parseSlotTime(b[0]);
      return aTime.startMin - bTime.startMin;
    });

    for (const [timeSlot, slotCode] of sortedTimeSlots) {
      if (slotCode === 'Lunch') continue;

      const matching = eligibleCourses.filter(c =>
        doesCourseMatchSlot(c.slot, dayKey!, slotCode, timeSlot)
      );

      for (const course of matching) {
        // Avoid duplicate entries (a course might match multiple time slots in a lab block)
        if (classes.some(c => c.code === course.code && c.timeSlot === timeSlot)) continue;

        const { startMin, endMin } = parseSlotTime(timeSlot);
        const isLive = currentMin >= startMin && currentMin < endMin;
        const isUpcoming = currentMin < startMin;

        classes.push({
          id: course.id || course.code,
          code: course.code,
          title: course.name,
          slot: course.slot,
          room: course.hall,
          timeSlot,
          isLive,
          isUpcoming,
        });
      }
    }
  }

  const activeClass = classes.find(c => c.isLive) || null;
  const nextClass = classes.find(c => c.isUpcoming) || null;

  return {
    todayClasses: classes,
    activeClass,
    nextClass,
    totalClassesToday: classes.length,
  };
}

import { MMKV } from 'react-native-mmkv';
const apiStorage = new MMKV({ id: 'oryn-api-cache' });

/** Get live mess menu payload for specified or current date */
export function getWidgetMessData(targetDate: Date = new Date()): WidgetMessData {
  const weekType = getWeekType(targetDate);
  const dayName = getDayName(targetDate);
  const mealType = getCurrentMealType(targetDate);
  const mealTimeLabel = getMealTimeLabel(mealType);

  let activeMenu = MESS_MENU;
  const cachedRaw = apiStorage.getString('cache:mess_menu');
  if (cachedRaw) {
    try { activeMenu = JSON.parse(cachedRaw); } catch {}
  }

  const dayMenu = activeMenu[weekType]?.[dayName] || MESS_MENU[weekType][dayName];
  const meal = dayMenu?.[mealType] || MESS_MENU[weekType][dayName][mealType];

  return {
    weekType,
    dayName,
    mealType,
    mealTimeLabel,
    main: meal?.main || [],
    accompaniments: meal?.accompaniments || [],
    beverage: meal?.beverage,
    dessert: meal?.dessert,
    extras: meal?.extras,
  };
}

/** Get category emails payload */
export function getWidgetCategoryEmailsData(selectedCategory: string = 'Placements'): WidgetCategoryEmailsData {
  const allEmails = useEmailsStore.getState().emails || [];
  const emailsMap: Record<string, WidgetEmailItem[]> = {};
  const unreadCounts: Record<string, number> = {};

  EMAIL_CATEGORIES.forEach((cat) => {
    let filtered: ParsedEmail[] = [];
    if (cat === 'All') {
      filtered = allEmails;
    } else {
      filtered = allEmails.filter(
        (e) => (e.categoryGroup || '').toLowerCase() === cat.toLowerCase()
      );
    }
    emailsMap[cat] = filtered.slice(0, 5).map(mapToWidgetEmail);
    unreadCounts[cat] = filtered.filter((e) => e.isUnread).length;
  });

  return {
    activeCategory: selectedCategory,
    categories: EMAIL_CATEGORIES,
    emails: emailsMap,
    unreadCounts,
  };
}

/** Build full Oryn Widget Payload */
export function buildWidgetPayload(selectedEmailCategory: string = 'Placements'): OrynWidgetPayload {
  return {
    lastUpdated: new Date().toISOString(),
    academic: getWidgetAcademicData(),
    mess: getWidgetMessData(),
    categoryMails: getWidgetCategoryEmailsData(selectedEmailCategory),
  };
}

/** Sync payload to native Android widgets via OrynWidgetModule */
export function syncWidgetData(selectedCategory: string = 'Placements'): OrynWidgetPayload {
  const payload = buildWidgetPayload(selectedCategory);
  try {
    const jsonString = JSON.stringify(payload);

    // Push to native Android widgets via SharedPreferences + broadcast
    if (Platform.OS === 'android' && NativeModules.OrynWidgetModule?.updateWidgetData) {
      NativeModules.OrynWidgetModule.updateWidgetData(jsonString);
    }
  } catch (err) {
    console.warn('[WidgetDataService] Failed to sync widget data:', err);
  }
  return payload;
}
