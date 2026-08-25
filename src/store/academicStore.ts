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
} from '../constants/academicData';

const storage = new MMKV({ id: 'oryn-academic-store' });

const KEYS = {
  PROGRAM: 'academic:program',
  SEMESTER: 'academic:semester',
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

export interface ScheduledSlotEntry {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
  timeSlot: string;
  slotCode: string;
  courses: Course[];
}

export interface AcademicStore {
  program: ProgramType;
  semester: SemesterType;
  selectedElectiveIds: string[];

  setProgram: (program: ProgramType) => void;
  setSemester: (semester: SemesterType) => void;
  setAcademicProfile: (program: ProgramType, semester: SemesterType) => void;

  toggleElective: (courseId: string) => void;
  setSelectedElectives: (courseIds: string[]) => void;
  clearElectives: () => void;

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

  // Handle explicit time / day descriptions (e.g., SIDI courses)
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
      return ['2:00', '3:00', '4:00', '3:20', '4:20'].some(t => timeSlot.includes(t));
    }
    return true;
  }

  const components = cs.split('/').map(c => c.trim());

  for (const comp of components) {
    const compUpper = comp.toUpperCase();

    // Check EXCEPT clause (e.g. 'F (EXCEPT WED)')
    const exceptMatch = compUpper.match(/EXCEPT\s+([A-Z\s,\&]+)/);
    if (exceptMatch) {
      const exceptDays = exceptMatch[1];
      if (dayMatches(day, exceptDays)) {
        continue;
      }
    }

    const subClauses = comp.split(',').map(sc => sc.trim()).filter(Boolean);

    for (const sc of subClauses) {
      const scUpper = sc.toUpperCase();
      const scNoExcept = scUpper.replace(/EXCEPT\s+[A-Z\s,\&]+/g, '');

      const scDays: string[] = [];
      Object.keys(DAY_MAP).forEach(dKey => {
        if (dayMatches(dKey, scNoExcept)) {
          scDays.push(dKey);
        }
      });

      if (scDays.length > 0) {
        if (!scDays.includes(day)) {
          continue;
        }

        let cleanSc = scUpper;
        Object.keys(DAY_MAP).forEach(dKey => {
          (DAY_MAP[dKey] || []).forEach(alias => {
            cleanSc = cleanSc.replace(new RegExp(`\\b${alias}\\b`, 'g'), '');
          });
        });
        cleanSc = cleanSc.replace(/EXCEPT/g, '');

        const tokens = cleanSc.split(/[\/\,\s\(\)\+\&]+/).filter(Boolean);
        if (tokens.includes(targetCode)) {
          return true;
        }
      } else {
        let hasSiblingDayMatch = false;
        for (const sib of subClauses) {
          if (sib !== sc) {
            const sibNoExcept = sib.toUpperCase().replace(/EXCEPT\s+[A-Z\s,\&]+/g, '');
            const hasDaySpec = Object.keys(DAY_MAP).some(dKey => dayMatches(dKey, sibNoExcept));
            if (hasDaySpec && dayMatches(day, sibNoExcept)) {
              hasSiblingDayMatch = true;
              break;
            }
          }
        }

        if (hasSiblingDayMatch) {
          continue;
        }

        const tokens = scUpper.split(/[\/\,\s\(\)\+\&]+/).filter(Boolean);
        if (tokens.includes(targetCode)) {
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
    selectedElectiveIds: getInitialSelectedElectives(),

    setProgram: (program: ProgramType) => {
      storage.set(KEYS.PROGRAM, program);
      set({ program });
    },

    setSemester: (semester: SemesterType) => {
      storage.set(KEYS.SEMESTER, semester);
      set({ semester });
    },

    setAcademicProfile: (program: ProgramType, semester: SemesterType) => {
      storage.set(KEYS.PROGRAM, program);
      storage.set(KEYS.SEMESTER, semester);
      set({ program, semester });
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

    // Electives are available for 2nd, 3rd, and 4th years (Semester 3, Semester 5, Semester 7)
    isElectivesAvailable: () => {
      const { semester } = get();
      return semester !== 'Semester 1';
    },

    getCoreCourses: () => {
      const { program, semester } = get();

      if (semester === 'Semester 1') {
        return ALL_COURSES.filter(
          c => c.program !== 'Electives & Minors' && (c.semester === 'Semester 1' || c.program.includes('First Sem'))
        );
      }

      return ALL_COURSES.filter(c => {
        if (c.program === 'Electives & Minors') return false;
        const matchesSem = c.semester === semester;
        const matchesProg =
          c.program === program ||
          c.program.includes(program) ||
          program.includes(c.program);

        return matchesSem && matchesProg;
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

      if (!isElectiveAllowed) {
        return coreCourses;
      }

      const { selectedElectiveIds } = get();
      const allElectives = get().getAvailableElectives();
      const userSelectedElectives = allElectives.filter(e => selectedElectiveIds.includes(e.id));

      return [...coreCourses, ...userSelectedElectives];
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

          // Find ALL courses matching this day and slot code
          const matchingCourses = eligibleCourses.filter(c =>
            doesCourseMatchSlot(c.slot, day, slotCode, timeSlot)
          );

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
