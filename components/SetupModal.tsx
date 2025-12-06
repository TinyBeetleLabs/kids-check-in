/**
 * SetupModal Component
 * 
 * First-time setup modal for users to select their role and classroom
 */

import React, { useState, useEffect } from 'react';
import { UserRole, Classroom, saveUserProfile, UserProfile } from '@/lib/userProfile';

interface SetupModalProps {
  onComplete: () => void;
  onClose?: () => void;
  availableClassrooms: string[]; // Dynamic classrooms from API data
  availableLocations: string[]; // Dynamic locations from API data
  currentProfile?: UserProfile | null; // Current user profile to pre-populate form
}

export default function SetupModal({ onComplete, onClose, availableClassrooms, availableLocations, currentProfile }: SetupModalProps) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  // Pre-populate form with current profile when modal opens
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
      name: 'User', // Placeholder - will be pulled from Planning Center later
      role,
      assignedLocation: role === 'teacher' ? selectedLocation! : undefined,
      assignedClassroom: role === 'teacher' ? selectedClassroom! : undefined,
    });

    onComplete();
  };

  const canSubmit = role && (role === 'admin' || (selectedLocation && selectedClassroom));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col animate-scale-in relative my-4 md:my-8">
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 z-10"
              type="button"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 px-8 pt-8 pb-4">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentProfile ? 'Update Profile' : 'Welcome! 👋'}
              </h2>
              <p className="text-gray-600 mt-2">
                {currentProfile ? 'Change your role or classroom assignment' : "Let's set up your dashboard"}
              </p>
            </div>

            <form onSubmit={handleSubmit} id="setup-form" className="space-y-6">

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              I am a...
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  role === 'teacher'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    role === 'teacher' ? 'border-primary-500' : 'border-gray-400'
                  }`}>
                    {role === 'teacher' && (
                      <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">👨‍🏫 Teacher</div>
                    <div className="text-sm text-gray-600">I manage one classroom</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  role === 'admin'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    role === 'admin' ? 'border-primary-500' : 'border-gray-400'
                  }`}>
                    {role === 'admin' && (
                      <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">👑 Admin</div>
                    <div className="text-sm text-gray-600">I oversee all classrooms</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Location Selection (Teachers Only) */}
          {role === 'teacher' && (
            <div className="fade-in">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Which location?
              </label>
              {availableLocations.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
                  <p className="text-sm">No locations found in check-in data.</p>
                  <p className="text-xs mt-1">Please check your Planning Center setup.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableLocations.map((location) => (
                    <button
                      key={location}
                      type="button"
                      onClick={() => setSelectedLocation(location)}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        selectedLocation === location
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Classroom Selection (Teachers Only) */}
          {role === 'teacher' && selectedLocation && (
            <div className="fade-in">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Which classroom?
              </label>
              {availableClassrooms.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
                  <p className="text-sm">No classrooms found in check-in data.</p>
                  <p className="text-xs mt-1">Please check your Planning Center setup.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableClassrooms.map((classroom) => (
                    <button
                      key={classroom}
                      type="button"
                      onClick={() => setSelectedClassroom(classroom as Classroom)}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        selectedClassroom === classroom
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
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

          {/* Sticky Footer with Submit Button */}
          <div className="px-8 pb-8 pt-4 border-t border-gray-200 bg-white rounded-b-2xl">
            <button
              type="submit"
              form="setup-form"
              disabled={!canSubmit}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                canSubmit
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

