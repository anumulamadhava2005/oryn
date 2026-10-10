/**
 * Academic Timetable & Course Selection Store
 * Persists program, semester choices, and selected electives via MMKV.
 * Computes eligible courses and maps slot schedules.
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import {
  ALL_COURSES,
  Course,
  FIRST_SEM_SLOTS,
  HIGHER_SEM_SLOTS,
  PROGRAM_OPTIONS,
  ProgramType,
  SEMESTER_OPTIONS,
  SemesterType,
  BatchType,
  BATCH_OPTIONS,
} from '../constants/academicData';
import { useAuthStore } from './auth';

const storage = new MMKV({ id: 'oryn-academic-store' });

const KEYS = {
  PROGRAM: 'academic:program',
  SEMESTER: 'academic:semester',
  BATCH: 'academic:batch',
  ELECTIVES: 'academic:selectedElectives',
};

function getInitialProgram(): ProgramType {
  const stored = storage.getString(KEYS.PROGRAM) as ProgramType | undefined;
  if (stored && PROGRAM_OPTIONS.includes(stored)) {
    return stored;
  }
  return 'B.Tech CSE';
}

function getInitialSemester(): SemesterType {
  const stored = storage.getString(KEYS.SEMESTER) as SemesterType | undefined;
  if (stored && SEMESTER_OPTIONS.includes(stored)) {
    return stored;
  }
  return 'Semester 3';
}

export function detectBatchFromUser(): BatchType {
  try {
    const user = useAuthStore.getState().user;
    const email = user?.email || user?.name || '';
    // Look for roll pattern e.g. cs25b2005 or CS23B1034 or ai23b2009
    const match = email.match(/(?:CS|AI|EC|ME|EP|DS|MD|ED)\d{2}[a-zA-Z]+(\d{3,4})/i);
    if (match) {
      const num = parseInt(match[1], 10);
      // 2000 series is CSE (AI): Roll 1-8 is Batch 1 (<= 2008), 9+ is Batch 2 (>= 2009)
      if (num >= 2009 && num < 3000) {
        return 'Batch 2';
      }
      if (num >= 209 && num <= 299) {
        return 'Batch 2';
      }
    }
  } catch {}
  return 'Batch 1';
}

function getInitialBatch(): BatchType {
  const stored = storage.getString(KEYS.BATCH) as BatchType | undefined;
  if (stored && BATCH_OPTIONS.includes(stored)) {
    return stored;
  }
  return detectBatchFromUser();
}

function getInitialSelectedElectives(): string[] {
  const raw = storage.getString(KEYS.ELECTIVES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

import { fetchRemoteTimetable } from '@/services/orynApi';

export interface ScheduledSlotEntry {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
  timeSlot: string;
  slotCode: string;
  courses: Course[];
}

export interface AcademicStore {
  program: ProgramType;
  semester: SemesterType;
  batch: BatchType;
  selectedElectiveIds: string[];
  timetableVersion: number;

  setProgram: (program: ProgramType) => void;
  setSemester: (semester: SemesterType) => void;
  setBatch: (batch: BatchType) => void;
  setAcademicProfile: (program: ProgramType, semester: SemesterType, batch?: BatchType) => void;

  toggleElective: (courseId: string) => void;
  setSelectedElectives: (courseIds: string[]) => void;
  clearElectives: () => void;

  syncRemoteTimetable: () => Promise<void>;

  isElectivesAvailable: () => boolean;
  getCoreCourses: () => Course[];
  getAvailableElectives: () => Course[];
  getEligibleCourses: () => Course[];
  getWeeklySchedule: () => Record<string, ScheduledSlotEntry[]>;
}

const DAY_MAP: Record<string, string[]> = {
  MON: ['MON', 'MONDAY'],
  TUE: ['TUE', 'TUESDAY'],
  WED: ['WED', 'WEDNESDAY'],
  THU: ['THU', 'THURSDAY', 'THUR', 'THUS'],
  FRI: ['FRI', 'FRIDAY'],
  SAT: ['SAT', 'SATURDAY'],
};

function dayMatches(dayKey: string, text: string): boolean {
  const textUpper = text.toUpperCase();
  const aliases = DAY_MAP[dayKey] || [];
  return aliases.some(alias => new RegExp(`\\b${alias}\\b`).test(textUpper));
}

function splitTopLevel(text: string, delimiters: string[] = ['/', ',']): string[] {
  const parts: string[] = [];
  const current: string[] = [];
  let parenDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '(') {
      parenDepth++;
      current.push(char);
    } else if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      current.push(char);
    } else if (delimiters.includes(char) && parenDepth === 0) {
      parts.push(current.join('').trim());
      current.length = 0;
    } else {
      current.push(char);
    }
  }

  if (current.length > 0) {
    parts.push(current.join('').trim());
  }

  return parts.filter(Boolean);
}

export function doesCourseMatchSlot(
  courseSlot: string,
  day: string,
  slotCode: string,
  timeSlot: string = ''
): boolean {
  const targetCode = slotCode.trim().toUpperCase();
  if (targetCode === 'LUNCH') return false;

  const cs = courseSlot.trim();
  const csUpper = cs.toUpperCase();

  // Handle explicit time / day descriptions (e.g., SIDI design courses)
  if (
    csUpper.includes('AM TO') ||
    csUpper.includes('PM TO') ||
    csUpper.includes('10 TO 1') ||
    csUpper.includes('2 TO 5')
  ) {
    if (!dayMatches(day, cs)) return false;
    if (csUpper.includes('10 AM TO 1 PM') || csUpper.includes('10 TO 1')) {
      return ['10:00', '11:00', '12:00'].some(t => timeSlot.includes(t));
    }
    if (csUpper.includes('2 TO 5 PM') || csUpper.includes('2 TO 5')) {
      return ['14:00', '15:00', '16:00', '15:20', '16:20'].some(t => timeSlot.includes(t));
    }
    return true;
  }

  const components = splitTopLevel(cs, ['/']);

  for (const comp of components) {
    const compUpper = comp.toUpperCase();

    // Check EXCEPT clause (e.g. 'F (EXCEPT WED)')
    const exceptMatch = compUpper.match(/EXCEPT\s+([A-Z\s,\&]+)/);
    if (exceptMatch && dayMatches(day, exceptMatch[1])) {
      continue;
    }

    const subClauses = splitTopLevel(comp, [',']);

    for (const sc of subClauses) {
      const scUpper = sc.toUpperCase();
      const scNoExcept = scUpper.replace(/EXCEPT\s+[A-Z\s,\&]+/g, '');

      const scDays: string[] = [];
      Object.keys(DAY_MAP).forEach(dKey => {
        if (dayMatches(dKey, scNoExcept)) {
          scDays.push(dKey);
        }
      });

      // Clean tokens: remove day names and EXCEPT keywords
      let cleanSc = scUpper;
      Object.keys(DAY_MAP).forEach(dKey => {
        (DAY_MAP[dKey] || []).forEach(alias => {
          cleanSc = cleanSc.replace(new RegExp(`\\b${alias}\\b`, 'g'), '');
        });
      });
      cleanSc = cleanSc.replace(/EXCEPT/g, '');

      const rawTokens = cleanSc.split(/[\/\,\s\(\)\+\&]+/).filter(Boolean);

      // Expand tokens (e.g. H -> H1, H2, H3, H4 | H1-H2 -> H1, H2 | L3-X5 -> L3, X5)
      const expanded = new Set<string>(rawTokens);
      for (const rt of rawTokens) {
        if (['H', 'I', 'J', 'K', 'L'].includes(rt)) {
          expanded.add(`${rt}1`);
          expanded.add(`${rt}2`);
          expanded.add(`${rt}3`);
          expanded.add(`${rt}4`);
        } else if (rt.includes('-')) {
          const parts = rt.split('-');
          if (parts.length === 2 && parts[0].length >= 2 && parts[1].length >= 2) {
            const prefix = parts[0][0];
            const startN = parseInt(parts[0].slice(1), 10);
            const endN = parseInt(parts[1].slice(1), 10);
            if (!isNaN(startN) && !isNaN(endN) && parts[0][0] === parts[1][0]) {
              for (let n = startN; n <= endN; n++) {
                expanded.add(`${prefix}${n}`);
              }
            } else {
              parts.forEach(p => expanded.add(p));
            }
          }
        }
      }

      if (scDays.length > 0) {
        if (scDays.includes(day) && expanded.has(targetCode)) {
          return true;
        }
      } else {
        if (expanded.has(targetCode)) {
          return true;
        }
      }
    }
  }

  return false;
}

export const useAcademicStore = create<AcademicStore>()((set, get) => {
  return {
    program: getInitialProgram(),
    semester: getInitialSemester(),
    batch: getInitialBatch(),
    selectedElectiveIds: getInitialSelectedElectives(),
    timetableVersion: 0,

    setProgram: (program: ProgramType) => {
      storage.set(KEYS.PROGRAM, program);
      set({ program });
    },

    setSemester: (semester: SemesterType) => {
      storage.set(KEYS.SEMESTER, semester);
      set({ semester });
    },

    setBatch: (batch: BatchType) => {
      storage.set(KEYS.BATCH, batch);
      set({ batch });
    },

    setAcademicProfile: (program: ProgramType, semester: SemesterType, batch?: BatchType) => {
      storage.set(KEYS.PROGRAM, program);
      storage.set(KEYS.SEMESTER, semester);
      if (batch) {
        storage.set(KEYS.BATCH, batch);
        set({ program, semester, batch });
      } else {
        set({ program, semester });
      }
    },

    toggleElective: (courseId: string) => {
      const current = get().selectedElectiveIds;
      const updated = current.includes(courseId)
        ? current.filter(id => id !== courseId)
        : [...current, courseId];

      storage.set(KEYS.ELECTIVES, JSON.stringify(updated));
      set({ selectedElectiveIds: updated });
    },

    setSelectedElectives: (courseIds: string[]) => {
      storage.set(KEYS.ELECTIVES, JSON.stringify(courseIds));
      set({ selectedElectiveIds: courseIds });
    },

    clearElectives: () => {
      storage.delete(KEYS.ELECTIVES);
      set({ selectedElectiveIds: [] });
    },

    syncRemoteTimetable: async () => {
      try {
        const entries = await fetchRemoteTimetable();
        if (entries && entries.length > 0) {
          set(state => ({ timetableVersion: state.timetableVersion + 1 }));
        }
      } catch (err) {
        console.warn('[AcademicStore] Failed to sync timetable:', err);
      }
    },

    // Electives are available for 2nd, 3rd, and 4th years (Semester 3, Semester 5, Semester 7)
    isElectivesAvailable: () => {
      const { semester } = get();
      return semester !== 'Semester 1';
    },

    getCoreCourses: () => {
      const { program, semester, batch } = get();

      if (semester === 'Semester 1' || program === 'Common (First Sem)') {
        return ALL_COURSES.filter(
          c => c.program === 'Common (First Sem)' || c.semester === 'Semester 1'
        );
      }

      return ALL_COURSES.filter(c => {
        if (c.program === 'Electives & Minors') return false;
        const matchesSem = c.semester === semester;

        const isUserAI = program.includes('CSE (AI)');
        const isCourseAI = c.program.includes('CSE (AI)');
        const isUserCSE = program === 'B.Tech CSE';
        const isCourseCSE = c.program === 'B.Tech CSE';

        let matchesProg = false;
        if (isUserCSE) {
          matchesProg = isCourseCSE;
        } else if (isUserAI) {
          matchesProg = isCourseAI;
        } else {
          matchesProg =
            c.program === program ||
            c.program.includes(program) ||
            program.includes(c.program);
        }

        if (!matchesProg || !matchesSem) return false;

        // Batch matching:
        if (c.batch && c.batch !== 'All') {
          // B.Tech CSE is always Batch 1 for Semester 3
          if (isUserCSE && semester === 'Semester 3') {
            return c.batch === 'Batch 1';
          }
          return c.batch === batch;
        }

        return true;
      });
    },

    getAvailableElectives: () => {
      // Returns all elective courses parsed from Electives spreadsheet
      return ALL_COURSES.filter(
        c => c.program === 'Electives & Minors' || c.sourceFile.startsWith('Electives_')
      );
    },

    getEligibleCourses: () => {
      const coreCourses = get().getCoreCourses();
      const isElectiveAllowed = get().isElectivesAvailable();

      return !isElectiveAllowed
        ? coreCourses
        : [...coreCourses, ...get().getAvailableElectives().filter(e => get().selectedElectiveIds.includes(e.id))];
    },

    getWeeklySchedule: () => {
      const { semester } = get();
      const eligibleCourses = get().getEligibleCourses();
      const slotMatrix = semester === 'Semester 1' ? FIRST_SEM_SLOTS : HIGHER_SEM_SLOTS;

      const schedule: Record<string, ScheduledSlotEntry[]> = {
        MON: [],
        TUE: [],
        WED: [],
        THU: [],
        FRI: [],
      };

      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;

      days.forEach(day => {
        const timeMap = slotMatrix[day] || {};

        Object.entries(timeMap).forEach(([timeSlot, slotCode]) => {
          if (slotCode === 'Lunch') {
            schedule[day].push({
              day,
              timeSlot,
              slotCode: 'LUNCH',
              courses: [],
            });
            return;
          }

          // Find ALL courses matching this day and slot code using the static slot string
          const matchingCourses = eligibleCourses.filter(c => {
            return doesCourseMatchSlot(c.slot, day, slotCode, timeSlot);
          });

          schedule[day].push({
            day,
            timeSlot,
            slotCode,
            courses: matchingCourses,
          });
        });
      });

      return schedule;
    },
  };
});
