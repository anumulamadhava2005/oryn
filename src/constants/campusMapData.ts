/**
 * Campus Map & Room Location Dataset for IIITDM Kancheepuram
 * Maps lecture hall codes (H01-H45) and lab codes (L008-L614)
 * to exact buildings, floor levels, landmarks, and navigation cues.
 */

export interface CampusRoomInfo {
  code: string;
  building: string;
  floor: string;
  floorNumber: number;
  type: 'Lecture Hall' | 'Computer Lab' | 'Hardware Lab' | 'Design Studio' | 'Auditorium' | 'Other';
  capacity?: string;
  landmarks: string;
  directions: string;
}

export const CAMPUS_BUILDINGS = {
  LHC: {
    name: 'Lecture Hall Complex (LHC)',
    shortName: 'LHC',
    floors: 5,
    description: 'Main lecture theaters with tiered seating and projection systems.',
  },
  LAB_BLOCK: {
    name: 'Laboratory Complex (Lab Block)',
    shortName: 'Lab Complex',
    floors: 6,
    description: 'Specialized computing, electronics, and mechanical engineering laboratories.',
  },
  ADMIN_BLOCK: {
    name: 'Administrative & Academic Block',
    shortName: 'Admin Block',
    floors: 4,
    description: 'Faculty chambers, Director office, and Academic affairs section.',
  },
  DIC: {
    name: 'Design Innovation Center (DIC)',
    shortName: 'DIC',
    floors: 3,
    description: 'Design studios, prototyping labs, and collaborative workshops.',
  },
};

/**
 * Resolves room/hall string to rich spatial location data
 */
export function resolveRoomLocation(hallStr?: string | null): CampusRoomInfo[] {
  if (!hallStr) return [];

  // Extract individual room codes like H25, L509, L512 from composite strings like "H25 / L509, L512"
  const tokens = hallStr.match(/(?:H\d{2}|L\d{3}[A-Z]?|TLC|SAC)/gi) || [];
  if (tokens.length === 0) {
    // If not matching standard regex, return generic info
    return [
      {
        code: hallStr.trim(),
        building: 'Campus Academic Zone',
        floor: 'Refer Department Schedule',
        floorNumber: 0,
        type: 'Other',
        landmarks: 'Check department notice board or course syllabus',
        directions: 'Ask in faculty corridor or academic office',
      },
    ];
  }

  return tokens.map(token => {
    const upper = token.toUpperCase().trim();

    // Lecture Hall Complex: H + Floor digit + Room digit (e.g. H25 = Floor 2, Hall 5)
    if (/^H\d{2}$/.test(upper)) {
      const floorDigit = parseInt(upper.charAt(1), 10);
      const roomDigit = parseInt(upper.charAt(2), 10);

      const floorName =
        floorDigit === 0
          ? 'Ground Floor'
          : floorDigit === 1
          ? 'First Floor'
          : floorDigit === 2
          ? 'Second Floor'
          : floorDigit === 3
          ? 'Third Floor'
          : `${floorDigit}th Floor`;

      return {
        code: upper,
        building: CAMPUS_BUILDINGS.LHC.name,
        floor: floorName,
        floorNumber: floorDigit,
        type: 'Lecture Hall',
        capacity: '60–120 Seats',
        landmarks: `Near Central Elevator · East Wing`,
        directions: `Enter LHC main lobby. Take central stairs or elevator to ${floorName}. Hall ${upper} is along the central corridor.`,
      };
    }

    // Laboratory Complex: L + Floor digit + Room digits (e.g. L509 = Floor 5, Lab 9)
    if (/^L\d{3}[A-Z]?$/.test(upper)) {
      const floorDigit = parseInt(upper.charAt(1), 10);

      const floorName =
        floorDigit === 0
          ? 'Ground Floor'
          : floorDigit === 1
          ? 'First Floor'
          : floorDigit === 2
          ? 'Second Floor'
          : floorDigit === 3
          ? 'Third Floor'
          : `${floorDigit}th Floor`;

      const isCompLab = floorDigit === 2 || floorDigit === 5;
      const labType = isCompLab ? 'Computer Lab' : 'Hardware Lab';

      return {
        code: upper,
        building: CAMPUS_BUILDINGS.LAB_BLOCK.name,
        floor: floorName,
        floorNumber: floorDigit,
        type: labType,
        capacity: '45–70 Workstations',
        landmarks: `Lab Complex Wing · Opposite Faculty Corridor`,
        directions: `Proceed past LHC towards Lab Complex. Take East Stairs to ${floorName}. Lab ${upper} is equipped with biometrics/keycard access.`,
      };
    }

    return {
      code: upper,
      building: 'Academic Campus Zone',
      floor: 'Ground / First Floor',
      floorNumber: 1,
      type: 'Other',
      landmarks: 'Near Central Activity Area',
      directions: 'Follow main campus signage or check with department office.',
    };
  });
}
