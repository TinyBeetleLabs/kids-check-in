/**
 * Mock Data Generator for Development
 *
 * Sample check-in data that mimics the structure returned by the Planning Center
 * Check-Ins API. Uses generic campus and classroom names for demos.
 *
 * Structure (matches Planning Center):
 * - Events named "Sunday Check-In – {Campus}" (location parsed after en dash)
 * - Service times configured per event
 * - Classrooms as event locations (Nursery, Toddlers, Preschool, etc.)
 *
 * Use during development by setting USE_MOCK_DATA=true in .env.local
 */

import { CLASSROOM_ORDER, StandardClassroom } from './classrooms';

export interface CheckInData {
  id: string;
  childName: string;
  familyName: string;
  securityCode: string;
  serviceName: string; // e.g. "Sunday Check-In – Main Campus • 10:00 AM"
  checkInTime: string;
  medicalNotes?: string;
  eventId: string;
  isFirstTime?: boolean;
  hasBirthday?: boolean;
  className?: string;
  checkedOut?: boolean;
  checkOutTime?: string;
  status?: 'active' | 'checked-out' | 'no-show';
  dismissTime?: string;

  locationId?: string;
  locationName?: string; // Campus name, e.g. "Main Campus"
  eventName?: string; // e.g. "Sunday Check-In – Main Campus"
  serviceTime?: string;

  rolledOverFrom?: string;
  isMultiService?: boolean;
  originalCheckInTime?: string;
  rolloverTimestamp?: number;
}

export type Classroom = StandardClassroom;

let cachedMockCheckIns: CheckInData[] | null = null;
const BASE_NOW = Date.now();

interface LocationConfig {
  id: string;
  name: string;
  eventName: string;
  eventId: string;
  serviceTimes: string[];
  classrooms: Classroom[];
}

export const LOCATIONS: LocationConfig[] = [
  {
    id: 'loc_main',
    name: 'Main Campus',
    eventName: 'Sunday Check-In – Main Campus',
    eventId: 'evt_main_001',
    serviceTimes: ['8:30 AM', '10:00 AM', '11:30 AM'],
    classrooms: [...CLASSROOM_ORDER],
  },
  {
    id: 'loc_north',
    name: 'North Campus',
    eventName: 'Sunday Check-In – North Campus',
    eventId: 'evt_north_001',
    serviceTimes: ['8:00 AM', '9:30 AM', '11:00 AM', '12:30 PM'],
    classrooms: [...CLASSROOM_ORDER],
  },
  {
    id: 'loc_south',
    name: 'South Campus',
    eventName: 'Sunday Check-In – South Campus',
    eventId: 'evt_south_001',
    serviceTimes: ['8:00 AM', '9:30 AM', '11:00 AM', '12:30 PM'],
    classrooms: [...CLASSROOM_ORDER],
  },
  {
    id: 'loc_east',
    name: 'East Campus',
    eventName: 'Sunday Check-In – East Campus',
    eventId: 'evt_east_001',
    serviceTimes: ['8:00 AM', '9:30 AM', '11:00 AM'],
    classrooms: [...CLASSROOM_ORDER],
  },
  {
    id: 'loc_west',
    name: 'West Campus',
    eventName: 'Sunday Check-In – West Campus',
    eventId: 'evt_west_001',
    serviceTimes: ['9:30 AM', '11:00 AM', '12:30 PM'],
    classrooms: [...CLASSROOM_ORDER],
  },
];

const FAMILY_NAMES = [
  'Anderson', 'Martinez', 'Thompson', 'Davis', 'Wilson', 'Rodriguez', 'Garcia',
  'Brown', 'Lee', 'Taylor', 'White', 'Harris', 'Martin', 'Jackson', 'Moore',
  'Cooper', 'Mitchell', 'Price', 'Bennett', 'Foster', 'Sanders', 'Peterson',
  'Hayes', 'Collins', 'Reed', 'Morgan', 'Bell', 'Murphy', 'Rivera', 'Cook',
  'Rogers', 'Stewart', 'Morris', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres',
  'Gray', 'Ramirez', 'James', 'Watson', 'Phillips', 'Campbell', 'Parker', 'Evans',
  'Edwards', 'Sanchez', 'Powell', 'Perry', 'Long', 'Hughes', 'Flores', 'Washington',
  'Butler', 'Simmons', 'Griffin', 'Russell', 'King', 'Wright', 'Lopez', 'Hill',
  'Scott', 'Green', 'Adams', 'Nelson', 'Carter', 'Perez', 'Roberts', 'Turner',
];

const FIRST_NAMES = [
  'Sophia', 'Liam', 'Emma', 'Noah', 'Olivia', 'Elijah', 'Mia', 'Lucas', 'Ava',
  'Isabella', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Ethan', 'Harper', 'Mason',
  'Evelyn', 'Alexander', 'Ella', 'Sebastian', 'Scarlett', 'Jackson', 'Luna', 'Ellie',
  'Caleb', 'Zoe', 'Maya', 'Nathan', 'Aria', 'Logan', 'Chloe', 'Isaac', 'Bella',
  'Ryan', 'Leah', 'Connor', 'Sophie', 'Tyler', 'Aubrey', 'Wyatt', 'Jacob', 'Natalie',
  'Landon', 'Hannah', 'Cameron', 'Violet', 'Owen', 'Lily', 'Miles', 'Stella', 'Blake',
  'Savannah', 'Aiden', 'Lucy', 'Julian', 'Madelyn', 'Grayson', 'Paisley', 'Hudson',
  'Eleanor', 'Lincoln', 'Hazel', 'Nolan', 'Kennedy', 'Beckett', 'Reagan', 'Rylee',
  'Axel', 'Brooklyn', 'Easton', 'Piper', 'Maverick', 'Aurora', 'Jaxon', 'Kinsley',
  'Carson', 'Skylar', 'Brody', 'Asher', 'Ivy', 'Wesley', 'Emerson', 'Sawyer', 'Quinn',
  'Rowan', 'Silas', 'Nova', 'Declan', 'Ember', 'River', 'Levi', 'Willow', 'Knox',
];

const MEDICAL_NOTES = [
  'Peanut allergy',
  'Dairy allergy',
  'EpiPen for bee stings',
  'Asthma - inhaler in bag',
  'Gluten-free snacks only',
  'Needs help with bathroom',
  'Lactose intolerant',
  'Shellfish allergy',
  'Needs to sit near front',
  'ADHD medication at noon',
  'Needs water frequently',
  'Type 1 diabetes - monitor sugar',
  'Egg allergy',
  'Hearing aid - speak clearly',
  'Gluten allergy',
  'Carries EpiPen',
  'No red dye #40',
  'Milk, Eggs',
  'No Cashews',
  '',
];

function getTimeOffset(serviceTime: string): number {
  const baseOffsets: Record<string, number> = {
    '8:00 AM': 180,
    '8:30 AM': 165,
    '9:30 AM': 90,
    '10:00 AM': 60,
    '11:00 AM': 15,
    '11:30 AM': 0,
    '12:30 PM': -30,
  };
  return baseOffsets[serviceTime] || 60;
}

export function getMockCheckIns(): CheckInData[] {
  if (cachedMockCheckIns) {
    return cachedMockCheckIns;
  }

  const now = BASE_NOW;
  let id = 1;
  let codeNum = 100;

  const checkIns: CheckInData[] = [];
  const usedNames = new Set<string>();

  const addCheckIn = (
    firstName: string,
    lastName: string,
    locationId: string,
    serviceTime: string,
    classroom: Classroom,
    options: {
      medicalNotes?: string;
      isFirstTime?: boolean;
      hasBirthday?: boolean;
      sameFamily?: boolean;
    } = {}
  ) => {
    const location = LOCATIONS.find((loc) => loc.id === locationId);
    if (!location) return;

    const offset = getTimeOffset(serviceTime);
    const checkInTime = new Date(now - offset * 60000 + Math.random() * 10 * 60000);

    const code = options.sameFamily
      ? `${String.fromCharCode(65 + Math.floor((codeNum - 1) / 1000))}${((codeNum - 1) % 1000).toString().padStart(3, '0')}`
      : `${String.fromCharCode(65 + Math.floor(codeNum / 1000))}${(codeNum++ % 1000).toString().padStart(3, '0')}`;

    const serviceName = `${location.eventName} • ${serviceTime}`;

    checkIns.push({
      id: String(id++),
      childName: `${firstName} ${lastName}`,
      familyName: lastName,
      securityCode: code,
      serviceName,
      serviceTime,
      locationId: location.id,
      locationName: location.name,
      eventName: location.eventName,
      eventId: location.eventId,
      className: classroom,
      checkInTime: checkInTime.toISOString(),
      medicalNotes: options.medicalNotes || '',
      isFirstTime: options.isFirstTime,
      hasBirthday: options.hasBirthday,
    });
  };

  const generateCheckInsForClassroom = (
    locationId: string,
    serviceTime: string,
    classroom: Classroom,
    count: number
  ) => {
    for (let i = 0; i < count; i++) {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = FAMILY_NAMES[Math.floor(Math.random() * FAMILY_NAMES.length)];
      const fullName = `${firstName} ${lastName}`;

      if (usedNames.has(fullName)) continue;
      usedNames.add(fullName);

      const options: Parameters<typeof addCheckIn>[5] = {
        isFirstTime: Math.random() < 0.15,
        hasBirthday: Math.random() < 0.1,
        medicalNotes:
          Math.random() < 0.3 ? MEDICAL_NOTES[Math.floor(Math.random() * MEDICAL_NOTES.length)] : '',
      };

      addCheckIn(firstName, lastName, locationId, serviceTime, classroom, options);

      if (Math.random() < 0.3 && i < count - 1) {
        const siblingFirstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        addCheckIn(siblingFirstName, lastName, locationId, serviceTime, classroom, {
          sameFamily: true,
          medicalNotes:
            Math.random() < 0.2 ? MEDICAL_NOTES[Math.floor(Math.random() * MEDICAL_NOTES.length)] : '',
        });
        i++;
      }
    }
  };

  LOCATIONS.forEach((location) => {
    location.serviceTimes.forEach((serviceTime) => {
      location.classrooms.forEach((classroom) => {
        const kidsCount = Math.floor(Math.random() * 7) + 2;
        generateCheckInsForClassroom(location.id, serviceTime, classroom, kidsCount);
      });
    });
  });

  // Notable check-ins for testing specific scenarios
  addCheckIn('Gracie', 'Chen', 'loc_main', '10:00 AM', 'Elementary', {
    medicalNotes: 'Peanut allergy',
  });
  addCheckIn('Edward', 'Park', 'loc_north', '8:00 AM', 'Nursery');
  addCheckIn('Kate', 'Walsh', 'loc_south', '11:00 AM', 'Pre-K');
  addCheckIn('Mike', 'Walsh', 'loc_south', '11:00 AM', 'Pre-K', { sameFamily: true });
  addCheckIn('Jan', 'Walsh', 'loc_south', '11:00 AM', 'Pre-K', {
    sameFamily: true,
    hasBirthday: true,
  });
  addCheckIn('Bella', 'Nguyen', 'loc_east', '9:30 AM', 'Preschool', {
    isFirstTime: true,
    medicalNotes: 'Shy, needs encouragement',
  });
  addCheckIn('Mason', 'Brooks', 'loc_west', '12:30 PM', 'Elementary', {
    hasBirthday: true,
  });

  cachedMockCheckIns = checkIns;
  return checkIns;
}
