/**
 * Attendance & Bunk Forecaster Store
 * Tracks class attendance, calculates the 75%/85% mandatory limit,
 * safe bunks remaining, and required catch-up lectures.
 * Persisted using high-performance MMKV.
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'oryn-attendance-store' });

const STORAGE_KEY = 'attendance:data';
const THRESHOLD_KEY = 'attendance:global_threshold';

export interface AttendanceLog {
  id: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string;
  status: 'present' | 'absent' | 'cancelled';
  timestamp: number;
}

export interface CourseAttendanceRecord {
  courseId: string;
  courseCode: string;
  courseName: string;
  attended: number;
  totalHeld: number;
  targetThreshold: number; // 75 or 85
  logs: AttendanceLog[];
}

export interface CourseAttendanceStats {
  percentage: number;
  safeBunks: number;
  mustAttend: number;
  statusLevel: 'good' | 'warning' | 'critical';
}

interface AttendanceState {
  records: Record<string, CourseAttendanceRecord>;
  globalThreshold: number; // default 75

  // Actions
  markAttendance: (
    courseId: string,
    courseCode: string,
    courseName: string,
    status: 'present' | 'absent' | 'cancelled',
    date?: string,
    timeSlot?: string
  ) => void;
  undoLastAction: (courseId: string) => void;
  setManualCounts: (courseId: string, attended: number, totalHeld: number) => void;
  setCourseThreshold: (courseId: string, threshold: number) => void;
  setGlobalThreshold: (threshold: number) => void;
  resetCourseAttendance: (courseId: string) => void;

  // Selectors
  getCourseRecord: (courseId: string) => CourseAttendanceRecord | null;
  getCourseStats: (courseId: string) => CourseAttendanceStats;
  getTodayLogForSlot: (courseId: string, date: string, timeSlot?: string) => AttendanceLog | null;
}

function calculateStats(attended: number, totalHeld: number, target = 75): CourseAttendanceStats {
  const T = target / 100;
  const percentage = totalHeld > 0 ? (attended / totalHeld) * 100 : 100;
  let safeBunks = 0;
  let mustAttend = 0;

  if (percentage >= target) {
    safeBunks = Math.floor((attended - T * totalHeld) / T);
    if (safeBunks < 0) safeBunks = 0;
  } else {
    mustAttend = Math.ceil((T * totalHeld - attended) / (1 - T));
    if (mustAttend < 0) mustAttend = 0;
  }

  let statusLevel: 'good' | 'warning' | 'critical' = 'good';
  if (percentage < target) {
    statusLevel = 'critical';
  } else if (percentage < target + 5) {
    statusLevel = 'warning';
  }

  return {
    percentage: Math.round(percentage * 10) / 10,
    safeBunks,
    mustAttend,
    statusLevel,
  };
}

function loadStoredRecords(): Record<string, CourseAttendanceRecord> {
  try {
    const raw = storage.getString(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadStoredThreshold(): number {
  try {
    const raw = storage.getNumber(THRESHOLD_KEY);
    return raw && (raw === 75 || raw === 85) ? raw : 75;
  } catch {
    return 75;
  }
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: loadStoredRecords(),
  globalThreshold: loadStoredThreshold(),

  markAttendance: (courseId, courseCode, courseName, status, date, timeSlot) => {
    const now = new Date();
    const activeDate = date || now.toISOString().split('T')[0];
    const logId = `${courseId}-${activeDate}-${timeSlot || 'slot'}-${Date.now()}`;

    set(state => {
      const existing = state.records[courseId] || {
        courseId,
        courseCode,
        courseName,
        attended: 0,
        totalHeld: 0,
        targetThreshold: state.globalThreshold,
        logs: [],
      };

      // If already logged today for this exact slot, replace it rather than duplicate
      const filteredLogs = existing.logs.filter(
        l => !(l.date === activeDate && l.timeSlot === timeSlot)
      );

      // Re-calculate counts if we are updating an existing day's log
      let newAttended = existing.attended;
      let newTotal = existing.totalHeld;

      const existingSlotLog = existing.logs.find(
        l => l.date === activeDate && l.timeSlot === timeSlot
      );

      if (existingSlotLog) {
        if (existingSlotLog.status === 'present') {
          newAttended = Math.max(0, newAttended - 1);
          newTotal = Math.max(0, newTotal - 1);
        } else if (existingSlotLog.status === 'absent') {
          newTotal = Math.max(0, newTotal - 1);
        }
      }

      if (status === 'present') {
        newAttended += 1;
        newTotal += 1;
      } else if (status === 'absent') {
        newTotal += 1;
      }

      const newLog: AttendanceLog = {
        id: logId,
        courseId,
        date: activeDate,
        timeSlot,
        status,
        timestamp: Date.now(),
      };

      const updatedRecord: CourseAttendanceRecord = {
        ...existing,
        courseCode,
        courseName,
        attended: newAttended,
        totalHeld: newTotal,
        logs: [newLog, ...filteredLogs].slice(0, 60), // keep last 60 logs
      };

      const updatedRecords = {
        ...state.records,
        [courseId]: updatedRecord,
      };

      storage.set(STORAGE_KEY, JSON.stringify(updatedRecords));
      return { records: updatedRecords };
    });
  },

  undoLastAction: (courseId) => {
    set(state => {
      const record = state.records[courseId];
      if (!record || record.logs.length === 0) return state;

      const [lastLog, ...remainingLogs] = record.logs;
      let newAttended = record.attended;
      let newTotal = record.totalHeld;

      if (lastLog.status === 'present') {
        newAttended = Math.max(0, newAttended - 1);
        newTotal = Math.max(0, newTotal - 1);
      } else if (lastLog.status === 'absent') {
        newTotal = Math.max(0, newTotal - 1);
      }

      const updatedRecord: CourseAttendanceRecord = {
        ...record,
        attended: newAttended,
        totalHeld: newTotal,
        logs: remainingLogs,
      };

      const updatedRecords = {
        ...state.records,
        [courseId]: updatedRecord,
      };

      storage.set(STORAGE_KEY, JSON.stringify(updatedRecords));
      return { records: updatedRecords };
    });
  },

  setManualCounts: (courseId, attended, totalHeld) => {
    set(state => {
      const record = state.records[courseId];
      if (!record) return state;

      const validAttended = Math.max(0, attended);
      const validTotal = Math.max(validAttended, totalHeld);

      const updatedRecords = {
        ...state.records,
        [courseId]: {
          ...record,
          attended: validAttended,
          totalHeld: validTotal,
        },
      };

      storage.set(STORAGE_KEY, JSON.stringify(updatedRecords));
      return { records: updatedRecords };
    });
  },

  setCourseThreshold: (courseId, threshold) => {
    set(state => {
      const record = state.records[courseId];
      if (!record) return state;

      const updatedRecords = {
        ...state.records,
        [courseId]: {
          ...record,
          targetThreshold: threshold,
        },
      };

      storage.set(STORAGE_KEY, JSON.stringify(updatedRecords));
      return { records: updatedRecords };
    });
  },

  setGlobalThreshold: (threshold) => {
    storage.set(THRESHOLD_KEY, threshold);
    set({ globalThreshold: threshold });
  },

  resetCourseAttendance: (courseId) => {
    set(state => {
      const updatedRecords = { ...state.records };
      delete updatedRecords[courseId];
      storage.set(STORAGE_KEY, JSON.stringify(updatedRecords));
      return { records: updatedRecords };
    });
  },

  getCourseRecord: (courseId) => {
    return get().records[courseId] || null;
  },

  getCourseStats: (courseId) => {
    const record = get().records[courseId];
    if (!record) {
      return calculateStats(0, 0, get().globalThreshold);
    }
    return calculateStats(record.attended, record.totalHeld, record.targetThreshold);
  },

  getTodayLogForSlot: (courseId, date, timeSlot) => {
    const record = get().records[courseId];
    if (!record) return null;
    return record.logs.find(l => l.date === date && (timeSlot ? l.timeSlot === timeSlot : true)) || null;
  },
}));
