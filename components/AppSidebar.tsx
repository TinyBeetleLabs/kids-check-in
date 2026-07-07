/**
 * AppSidebar — primary navigation (desktop sidebar + mobile drawer)
 */

import React from 'react';
import { UserProfile } from '@/lib/userProfile';

interface AppSidebarProps {
  userProfile: UserProfile | null;
  activeAdminTab: 'overview' | 'checkins';
  onAdminTabChange: (tab: 'overview' | 'checkins') => void;
  activeCheckInCount: number;
  onBrandClick: () => void;
  showResetButton: boolean;
  onSystemReset: () => void;
  onChangeProfile: () => void;
  mode: 'mock' | 'live' | null;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span className="w-5 h-5 shrink-0 opacity-90">{children}</span>;
}

export default function AppSidebar({
  userProfile,
  activeAdminTab,
  onAdminTabChange,
  activeCheckInCount,
  onBrandClick,
  showResetButton,
  onSystemReset,
  onChangeProfile,
  mode,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const isAdmin = userProfile?.role === 'admin';
  const isTeacher = userProfile?.role === 'teacher';

  const navItemClass = (active: boolean) =>
    `w-full flex items-center gap-sm px-md py-sm rounded-md font-text text-caption transition-colors text-left ${
      active
        ? 'bg-primary text-on-primary font-text text-caption-strong'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand — 5× click reveals System Reset */}
      <div className="px-md pt-lg pb-md border-b border-white/10">
        <button
          type="button"
          onClick={onBrandClick}
          className="flex items-center gap-sm w-full text-left rounded-md p-xs -m-xs hover:bg-white/5 transition-colors"
          aria-label="Kids Check-In"
        >
          <span
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-on-primary text-base leading-none shrink-0"
            aria-hidden="true"
          >
            ✦
          </span>
          <span className="font-text text-nav-link text-on-dark">Kids Check-In</span>
        </button>
        {showResetButton && (
          <button
            type="button"
            onClick={onSystemReset}
            className="mt-sm w-full flex items-center justify-center gap-xs px-sm py-xs rounded-md bg-red-600 hover:bg-red-700 text-white font-text text-fine-print animate-scale-in"
            title="Clear all cached data and reload"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            System Reset
          </button>
        )}
      </div>

      {/* Navigation */}
      {userProfile && (
        <nav className="flex-1 px-sm py-md space-y-xs overflow-y-auto">
          {isAdmin && (
            <>
              <button
                type="button"
                className={navItemClass(activeAdminTab === 'overview')}
                onClick={() => {
                  onAdminTabChange('overview');
                  onMobileClose();
                }}
              >
                <NavIcon>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </NavIcon>
                Overview
              </button>
              <button
                type="button"
                className={navItemClass(activeAdminTab === 'checkins')}
                onClick={() => {
                  onAdminTabChange('checkins');
                  onMobileClose();
                }}
              >
                <NavIcon>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </NavIcon>
                <span className="flex-1">Check-Ins</span>
                {activeCheckInCount > 0 && (
                  <span
                    className={`px-xs py-xxs rounded-pill text-fine-print min-w-[1.25rem] text-center ${
                      activeAdminTab === 'checkins' ? 'bg-white/20' : 'bg-primary/30 text-primary-light'
                    }`}
                  >
                    {activeCheckInCount}
                  </span>
                )}
              </button>
            </>
          )}
          {isTeacher && (
            <div className={navItemClass(true)}>
              <NavIcon>
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </NavIcon>
              <span className="truncate">{userProfile.assignedClassroom || 'My classroom'}</span>
            </div>
          )}
        </nav>
      )}

      {/* Footer */}
      {userProfile && (
        <div className="px-md py-md border-t border-white/10 space-y-sm">
          {mode && (
            <div className="flex gap-xs flex-wrap">
              <span className="px-sm py-xxs rounded-pill bg-white/10 text-fine-print text-slate-300">
                {mode === 'mock' ? 'Mock' : 'Live'}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              onChangeProfile();
              onMobileClose();
            }}
            className="w-full text-left font-text text-caption text-primary-light hover:text-white transition-colors"
          >
            Change profile
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="app-sidebar hidden md:flex">{sidebarContent}</aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
            aria-label="Close menu"
          />
          <aside className="app-sidebar relative z-10 w-[min(280px,85vw)] shadow-product animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
