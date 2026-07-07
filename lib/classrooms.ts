/**
 * Classroom display order, colors, and helpers.
 * Live data comes from Planning Center; themes apply to known room names.
 */

export const CLASSROOM_ORDER = [
  'Nursery',
  'Toddlers',
  'Preschool',
  'Pre-K',
  'Elementary',
] as const;

export type StandardClassroom = (typeof CLASSROOM_ORDER)[number];

export type ClassroomTheme = {
  accent: string;
  bg: string;
  bar: string;
  text: string;
};

export const CLASSROOM_THEMES: Record<string, ClassroomTheme> = {
  Nursery: { accent: '#10b981', bg: '#ecfdf5', bar: '#34d399', text: '#065f46' },
  Toddlers: { accent: '#3b82f6', bg: '#eff6ff', bar: '#60a5fa', text: '#1e40af' },
  Preschool: { accent: '#f59e0b', bg: '#fffbeb', bar: '#fbbf24', text: '#92400e' },
  'Pre-K': { accent: '#8b5cf6', bg: '#f5f3ff', bar: '#a78bfa', text: '#5b21b6' },
  Elementary: { accent: '#ef4444', bg: '#fef2f2', bar: '#f87171', text: '#991b1b' },
};

const DEFAULT_THEME: ClassroomTheme = {
  accent: '#6366f1',
  bg: '#eef2ff',
  bar: '#818cf8',
  text: '#3730a3',
};

export function getClassroomTheme(classroom: string): ClassroomTheme {
  return CLASSROOM_THEMES[classroom] ?? DEFAULT_THEME;
}

export function sortClassrooms(classrooms: string[]): string[] {
  return [...classrooms].sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    const indexA = CLASSROOM_ORDER.indexOf(a as StandardClassroom);
    const indexB = CLASSROOM_ORDER.indexOf(b as StandardClassroom);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
}
