/**
 * SetupModal Component
 */

import React, { useState, useEffect } from 'react';
import { UserRole, Classroom, saveUserProfile, UserProfile } from '@/lib/userProfile';
import Button from '@/components/ui/Button';

interface SetupModalProps {
  onComplete: () => void;
  onClose?: () => void;
  availableClassrooms: string[];
  availableLocations: string[];
  currentProfile?: UserProfile | null;
}

const roleCardBase =
  'w-full p-lg rounded-lg border-2 transition-all text-left active:scale-[0.98]';
const roleCardSelected = 'border-primary bg-canvas';
const roleCardDefault = 'border-hairline bg-canvas hover:border-ink-muted-48';

const optionChipBase =
  'px-lg py-sm rounded-pill border-2 font-text text-caption transition-all active:scale-[0.98]';
const optionChipSelected = 'border-primary-focus bg-primary text-on-primary';
const optionChipDefault = 'border-hairline bg-canvas text-ink hover:border-ink-muted-48';

export default function SetupModal({
  onComplete,
  onClose,
  availableClassrooms,
  availableLocations,
  currentProfile,
}: SetupModalProps) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  useEffect(() => {
    if (currentProfile) {
      setRole(currentProfile.role);
      if (currentProfile.role === 'teacher') {
        setSelectedLocation(currentProfile.assignedLocation || null);
        setSelectedClassroom(currentProfile.assignedClassroom || null);
      }
    }
  }, [currentProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!role) return;
    if (role === 'teacher' && (!selectedLocation || !selectedClassroom)) return;

    saveUserProfile({
      name: 'User',
      role,
      assignedLocation: role === 'teacher' ? selectedLocation! : undefined,
      assignedClassroom: role === 'teacher' ? selectedClassroom! : undefined,
    });

    onComplete();
  };

  const canSubmit = role && (role === 'admin' || (selectedLocation && selectedClassroom));

  return (
    <div className="fixed inset-0 bg-ink/20 backdrop-blur-[1px] z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-lg py-xl">
        <div className="bg-canvas rounded-lg border border-hairline max-w-md w-full max-h-[90vh] flex flex-col animate-scale-in relative my-md">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-lg right-lg text-ink-muted-48 hover:text-ink transition-colors p-xs rounded-full hover:bg-canvas-parchment z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
              type="button"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <div className="overflow-y-auto flex-1 px-xl pt-xl pb-md">
            <div className="text-center mb-lg">
              <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-md bg-gradient-to-br from-primary to-violet-500 shadow-card">
                <svg className="w-8 h-8 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="font-display text-display-md text-ink">
                {currentProfile ? 'Update Profile' : 'Welcome'}
              </h2>
              <p className="font-text text-body text-ink-muted-48 mt-xs">
                {currentProfile ? 'Change your role or classroom assignment' : "Let's set up your dashboard"}
              </p>
            </div>

            <form onSubmit={handleSubmit} id="setup-form" className="space-y-lg">
              <div>
                <label className="block font-text text-caption-strong text-ink mb-sm">I am a...</label>
                <div className="space-y-sm">
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`${roleCardBase} ${role === 'teacher' ? roleCardSelected : roleCardDefault}`}
                  >
                    <div className="flex items-center gap-sm">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          role === 'teacher' ? 'border-primary' : 'border-hairline'
                        }`}
                      >
                        {role === 'teacher' && <div className="w-3 h-3 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <div className="font-text text-body-strong text-ink">Teacher</div>
                        <div className="font-text text-caption text-ink-muted-48">I manage one classroom</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`${roleCardBase} ${role === 'admin' ? roleCardSelected : roleCardDefault}`}
                  >
                    <div className="flex items-center gap-sm">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          role === 'admin' ? 'border-primary' : 'border-hairline'
                        }`}
                      >
                        {role === 'admin' && <div className="w-3 h-3 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <div className="font-text text-body-strong text-ink">Admin</div>
                        <div className="font-text text-caption text-ink-muted-48">I oversee all classrooms</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {role === 'teacher' && (
                <div className="fade-in">
                  <label className="block font-text text-caption-strong text-ink mb-sm">Which location?</label>
                  {availableLocations.length === 0 ? (
                    <div className="p-lg bg-canvas-parchment rounded-lg text-center font-text text-caption text-ink-muted-48">
                      <p>No locations found in check-in data.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-xs">
                      {availableLocations.map((location) => (
                        <button
                          key={location}
                          type="button"
                          onClick={() => setSelectedLocation(location)}
                          className={`${optionChipBase} ${
                            selectedLocation === location ? optionChipSelected : optionChipDefault
                          }`}
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {role === 'teacher' && selectedLocation && (
                <div className="fade-in">
                  <label className="block font-text text-caption-strong text-ink mb-sm">Which classroom?</label>
                  {availableClassrooms.length === 0 ? (
                    <div className="p-lg bg-canvas-parchment rounded-lg text-center font-text text-caption text-ink-muted-48">
                      <p>No classrooms found in check-in data.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-xs">
                      {availableClassrooms.map((classroom) => (
                        <button
                          key={classroom}
                          type="button"
                          onClick={() => setSelectedClassroom(classroom as Classroom)}
                          className={`${optionChipBase} ${
                            selectedClassroom === classroom ? optionChipSelected : optionChipDefault
                          }`}
                        >
                          {classroom}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          <div className="px-xl pb-xl pt-md border-t border-hairline bg-canvas rounded-b-lg">
            {canSubmit ? (
              <Button variant="store-hero" type="submit" form="setup-form" className="w-full">
                Get Started →
              </Button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-md rounded-pill font-text text-body text-ink-muted-48 bg-divider-soft cursor-not-allowed"
              >
                Get Started →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
