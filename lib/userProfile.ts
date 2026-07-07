/**
 * User Profile Types and Management
 * 
 * Handles teacher and admin roles with classroom assignments
 */

export type UserRole = 'teacher' | 'admin';
export type Classroom = string; // Dynamic - populated from Planning Center API data

export interface UserProfile {
  name: string;
  role: UserRole;
  assignedClassroom?: Classroom;
  assignedLocation?: string; // Campus name (e.g. "Main Campus", "North Campus")
}

/**
 * Load user profile from localStorage
 */
export function loadUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading user profile:', err);
  }
  return null;
}

/**
 * Save user profile to localStorage
 */
export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('userProfile', JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving user profile:', err);
  }
}

/**
 * Clear user profile (logout)
 */
export function clearUserProfile(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('userProfile');
  } catch (err) {
    console.error('Error clearing user profile:', err);
  }
}

/**
 * Check if user has completed setup
 */
export function hasCompletedSetup(): boolean {
  return loadUserProfile() !== null;
}

