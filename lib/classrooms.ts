/**
 * Default classroom sort order (youngest to oldest).
 * Used for display sorting only — live data comes from Planning Center.
 */
export const CLASSROOM_ORDER = [
  'Nursery',
  'Toddlers',
  'Preschool',
  'Pre-K',
  'Elementary',
] as const;

export type StandardClassroom = (typeof CLASSROOM_ORDER)[number];

export function sortClassrooms(classrooms: string[]): string[] {
  return [...classrooms].sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    const indexA = CLASSROOM_ORDER.indexOf(a as StandardClassroom);
    const indexB = CLASSROOM_ORDER.indexOf(b as StandardClassroom);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
}
