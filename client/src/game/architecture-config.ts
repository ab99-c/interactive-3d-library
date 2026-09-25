export const LIBRARY_CONFIG = {
  building: {
    width: 48,
    length: 72,
    wallThickness: 0.30,
    floorHeight: 4.2,
    floorThickness: 0.30,
    minX: -24,
    maxX: 24,
    minZ: -36,
    maxZ: 36,
  },
  floors: {
    basement: -4.2,
    ground: 0,
    first: 4.2,
    second: 8.4,
  },
  corridors: {
    main: 4,
    secondary: 2,
    access: 1.5,
  },
  entrance: {
    width: 5,
    depth: 3,
    southZ: -36,
  },
  reception: { width: 8, depth: 5 },
  centralHall: { width: 14, length: 18 },
  shelves: {
    height: 2.1,
    width: 0.9,
    depth: 0.35,
    doubleDepth: 0.75,
    boardThickness: 0.04,
    levels: 5,
  },
  reading: { width: 12, length: 18, tableGap: 1.2, centralAisle: 2 },
  study: { deskWidth: 1.2, deskDepth: 0.7, chairClearance: 0.9 },
  groupRoom: { width: 4, depth: 5, doorWidth: 0.9, count: 4 },
  digital: { width: 12, depth: 10, rowGap: 1.2 },
  reference: { width: 8, depth: 10 },
  periodicals: { width: 8, depth: 10 },
  specialCollections: { width: 8, depth: 10 },
  stairs: { width: 1.5, landing: 1.5 },
  elevator: { width: 2.2, depth: 2.2, doorWidth: 1, clearWidth: 2, clearDepth: 2 },
  doors: { standardWidth: 0.9, standardHeight: 2.1 },
} as const;

export const FLOOR_SECTIONS = {
  ground: ["GENERAL", "REFERENCE", "PERIODICALS", "SPECIAL_COLLECTIONS", "READING", "STUDY", "DIGITAL"],
  first: ["SCIENCE", "ENGINEERING", "COMPUTER_SCIENCE", "READING", "STUDY_ROOMS", "COMPUTER_LAB", "QUIET_STUDY"],
  second: ["LITERATURE", "HISTORY", "HUMANITIES", "SOCIAL_SCIENCES", "READING", "QUIET_STUDY", "SPECIAL_COLLECTIONS"],
  basement: ["ARCHIVE", "STORAGE", "TECHNICAL", "STAFF", "EQUIPMENT"],
} as const;

export type LibraryFloor = keyof typeof LIBRARY_CONFIG.floors;
export type LibrarySection = (typeof FLOOR_SECTIONS)[LibraryFloor][number];

export type ShelfAddress = {
  building: "UNIVERSITY_LIBRARY";
  floor: LibraryFloor;
  section: string;
  row: string;
  shelf: string;
  slot: number;
};
