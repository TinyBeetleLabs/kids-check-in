/**
 * Main Dashboard Page
 * 
 * This is the primary interface for the Radiant Kids Check-In Dashboard.
 * 
 * FEATURES:
 * - Displays live check-ins grouped by service time
 * - Smart time-based auto-refresh:
 *   • 30 seconds during service times:
 *     - Sunday: 7:30 AM - 1:00 PM
 *     - Wednesday: 6:00 PM - 8:30 PM
 *   • 5 minutes during off-hours
 * - Request deduplication to prevent duplicate API calls
 * - Visibility-based refresh (pauses when tab is not active)
 * - Responsive design optimized for tablets (iPad) in classrooms
 * - Clean, professional UI with easy-to-read fonts and colors
 * 
 * HOW TO CUSTOMIZE:
 * - Refresh intervals: Change REFRESH_INTERVAL_SERVICE_TIME or REFRESH_INTERVAL_OFF_HOURS
 * - Service times: Modify isServiceTime() function
 * - Styling: Modify Tailwind classes throughout
 * - Data structure: Edit CheckInData interface in lib/mockData.ts
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import CheckInTable from '@/components/CheckInTable';
import CheckedOutList from '@/components/CheckedOutList';
import Toast from '@/components/Toast';
import Loader from '@/components/Loader';
import SetupModal from '@/components/SetupModal';
import AdminStats from '@/components/AdminStats';
import RecentCheckoutsTray, { RecentCheckoutItem } from '@/components/RecentCheckoutsTray';
import StatsBar from '@/components/StatsBar';
import ServiceTimeFilterRow from '@/components/ServiceTimeFilterRow';

const FILTER_SELECT_CLASS =
  'w-full px-md py-xs rounded-pill border border-hairline font-text text-caption text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-primary-focus min-h-[36px] cursor-pointer';
import { CheckInData, LOCATIONS } from '@/lib/mockData';
import { fetchCheckins } from '@/lib/fetchCheckins';
import { UserProfile, loadUserProfile, Classroom } from '@/lib/userProfile';

// Refresh intervals in milliseconds
const REFRESH_INTERVAL_SERVICE_TIME = 30000;  // 30 seconds during service times
const REFRESH_INTERVAL_OFF_HOURS = 5 * 60 * 1000; // 5 minutes during off-hours

// No hardcoded classrooms - all will be derived from check-in data

/**
 * Determines if current time is during service hours
 * Service times:
 * - Sunday: 7:30 AM - 1:00 PM
 * - Wednesday: 6:00 PM - 8:30 PM
 */
const isServiceTime = (): boolean => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 3 = Wednesday
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  // Sunday service: 7:30 AM - 1:00 PM
  if (day === 0) {
    const sundayStart = 7 * 60 + 30; // 7:30 AM (450 minutes)
    const sundayEnd = 13 * 60; // 1:00 PM (780 minutes)
    return currentTimeInMinutes >= sundayStart && currentTimeInMinutes <= sundayEnd;
  }
  
  // Wednesday service: 6:00 PM - 8:30 PM
  if (day === 3) {
    const wednesdayStart = 18 * 60; // 6:00 PM (1080 minutes)
    const wednesdayEnd = 20 * 60 + 30; // 8:30 PM (1230 minutes)
    return currentTimeInMinutes >= wednesdayStart && currentTimeInMinutes <= wednesdayEnd;
  }
  
  return false; // Not a service day
};

/**
 * Gets the appropriate refresh interval based on current time
 */
const getRefreshInterval = (): number => {
  return isServiceTime() ? REFRESH_INTERVAL_SERVICE_TIME : REFRESH_INTERVAL_OFF_HOURS;
};

export default function Home() {
  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  
  // Admin tab state
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'checkins'>('overview');
  
  // State management
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mode, setMode] = useState<'mock' | 'live' | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('All');
  const [selectedServiceTime, setSelectedServiceTime] = useState<string>('All');
  const [checkoutServiceTime, setCheckoutServiceTime] = useState<string>('All');
  const [refreshMode, setRefreshMode] = useState<'service' | 'off-hours'>('off-hours');
  const [toast, setToast] = useState<{ message: string; onUndo?: () => void; duration?: number } | null>(null);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [filtersLoaded, setFiltersLoaded] = useState<boolean>(false);
  const [recentCheckouts, setRecentCheckouts] = useState<RecentCheckoutItem[]>([]);
  
  // Hidden system reset (Easter egg)
  const [titleClickCount, setTitleClickCount] = useState<number>(0);
  const [showResetButton, setShowResetButton] = useState<boolean>(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pruneRecentTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for deduplication and visibility tracking
  const fetchInProgress = useRef<boolean>(false);
  const lastFetchTime = useRef<number>(0);
  const failureCount = useRef<number>(0);
  const lastErrorTime = useRef<number>(0);
  
  // Pull-to-refresh tracking
  const pullStartY = useRef<number>(0);
  const pullDistance = useRef<number>(0);
  
  // Refs for service time scroll containers
  const overviewServiceTimeScrollRef = useRef<HTMLDivElement>(null);
  const checkInsServiceTimeScrollRef = useRef<HTMLDivElement>(null);

  /**
   * Load user profile on component mount
   */
  useEffect(() => {
    const profile = loadUserProfile();
    if (profile) {
      setUserProfile(profile);
      
      // Auto-select teacher's assigned classroom
      if (profile.role === 'teacher' && profile.assignedClassroom) {
        setSelectedClassroom(profile.assignedClassroom);
      }
    } else {
      // Show setup modal for first-time users
      setShowSetupModal(true);
    }
  }, []);

  /**
   * Load checkout service filter from localStorage
   */
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('checkoutServiceTime') : null;
      if (saved) {
        setCheckoutServiceTime(saved);
      }
    } catch (err) {
      console.error('Error loading checkout service time:', err);
    }
  }, []);

  /**
   * Persist checkout service filter to localStorage
   */
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('checkoutServiceTime', checkoutServiceTime);
      }
    } catch (err) {
      console.error('Error saving checkout service time:', err);
    }
  }, [checkoutServiceTime]);

  /**
   * Clean up old roll-over records from localStorage on mount
   * Roll-overs should only persist for the current service day
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rolloverRecords');
      if (saved) {
        const rollovers: CheckInData[] = JSON.parse(saved);
        
        // Get today's date at midnight (start of day) in local timezone
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.getTime();
        
        // Filter out roll-overs from previous days
        const currentDayRollovers = rollovers.filter(rollover => {
          if (rollover.rolloverTimestamp && rollover.rolloverTimestamp >= todayStart) {
            return true; // Keep roll-overs from today
          }
          return false; // Remove roll-overs from previous days
        });
        
        // If we removed any old roll-overs, update localStorage
        if (currentDayRollovers.length < rollovers.length) {
          const removedCount = rollovers.length - currentDayRollovers.length;
          console.log(`🗑️  Cleaned up ${removedCount} old roll-over record(s) from previous days`);
          
          if (currentDayRollovers.length > 0) {
            localStorage.setItem('rolloverRecords', JSON.stringify(currentDayRollovers));
          } else {
            localStorage.removeItem('rolloverRecords');
          }
        }
      }
    } catch (err) {
      console.error('Error cleaning up old roll-over records:', err);
    }
  }, []); // Run once on mount

  /**
   * Load filter selections from localStorage
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && !filtersLoaded && userProfile) {
      try {
        const savedLocation = localStorage.getItem('selectedLocation');
        const savedClassroom = localStorage.getItem('selectedClassroom');
        const savedServiceTime = localStorage.getItem('selectedServiceTime');
        
        // Always reset to 'All' if check-ins change significantly or if saved values don't match
        // This prevents stale filter state causing empty displays
        if (checkIns.length > 0) {
          // Validate saved location exists in current check-ins
          if (savedLocation && savedLocation !== 'All') {
            const locationExists = checkIns.some(c => c.locationName === savedLocation);
            if (locationExists) {
              setSelectedLocation(savedLocation);
            } else {
              // Saved location no longer exists, reset to 'All'
              setSelectedLocation('All');
              localStorage.setItem('selectedLocation', 'All');
            }
          } else if (!savedLocation || savedLocation === 'All') {
            setSelectedLocation('All');
          }
          
          // For teachers, always use their assigned classroom
          if (userProfile.role === 'teacher' && userProfile.assignedClassroom) {
            setSelectedClassroom(userProfile.assignedClassroom);
          } else if (savedClassroom && savedClassroom !== 'All') {
            // Validate saved classroom exists (check against standard classrooms too since they're always available)
            const standardClassrooms = ['Dreamers', 'Explorers', 'Heros', 'Legends', 'Club 456'];
            const classroomExists = checkIns.some(c => c.className === savedClassroom) || 
                                   standardClassrooms.includes(savedClassroom);
            if (classroomExists) {
              setSelectedClassroom(savedClassroom);
            } else {
              // Saved classroom no longer exists, reset to 'All'
              setSelectedClassroom('All');
              localStorage.setItem('selectedClassroom', 'All');
            }
          } else if (!savedClassroom || savedClassroom === 'All') {
            setSelectedClassroom('All');
          }
        } else {
          // No check-ins yet - reset all to 'All' to prevent stale filters
          setSelectedLocation('All');
          setSelectedClassroom('All');
          localStorage.setItem('selectedLocation', 'All');
          localStorage.setItem('selectedClassroom', 'All');
        }
        
        if (savedServiceTime) {
          // For teachers, don't allow "All" - reset to first available time if needed
          if (userProfile?.role === 'teacher' && savedServiceTime === 'All') {
            // Will be handled by the useEffect that auto-selects first service time
            setSelectedServiceTime('All'); // Temporary, will be updated by useEffect
          } else {
            setSelectedServiceTime(savedServiceTime);
          }
        } else {
          setSelectedServiceTime('All');
        }
        
        setFiltersLoaded(true);
      } catch (err) {
        console.error('Error loading filter state:', err);
        // On error, reset to defaults
        setSelectedLocation('All');
        setSelectedClassroom('All');
        setSelectedServiceTime('All');
        setFiltersLoaded(true);
      }
    }
  }, [filtersLoaded, userProfile, checkIns]);

  /**
   * Save filter selections to localStorage whenever they change
   */
  useEffect(() => {
    if (filtersLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem('selectedLocation', selectedLocation);
        localStorage.setItem('selectedClassroom', selectedClassroom);
        localStorage.setItem('selectedServiceTime', selectedServiceTime);
      } catch (err) {
        console.error('Error saving filter state:', err);
      }
    }
  }, [selectedLocation, selectedClassroom, selectedServiceTime, filtersLoaded]);

  /**
   * Load checked-out state from localStorage
   */
  const loadCheckedOutState = useCallback(() => {
    try {
      const saved = localStorage.getItem('checkedOutState');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Error loading checked-out state:', err);
    }
    return {};
  }, []);

  /**
   * Save checked-out state to localStorage
   */
  const saveCheckedOutState = useCallback((checkInsData: CheckInData[]) => {
    try {
      const checkedOutState: Record<string, { checkedOut: boolean; checkOutTime?: string }> = {};
      checkInsData.forEach(checkIn => {
        if (checkIn.checkedOut) {
          checkedOutState[checkIn.id] = {
            checkedOut: true,
            checkOutTime: checkIn.checkOutTime
          };
        }
      });
      localStorage.setItem('checkedOutState', JSON.stringify(checkedOutState));
    } catch (err) {
      console.error('Error saving checked-out state:', err);
    }
  }, []);

  /**
   * Load roll-over records from localStorage
   */
  const loadRolloverRecords = useCallback((): CheckInData[] => {
    try {
      const saved = localStorage.getItem('rolloverRecords');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Error loading roll-over records:', err);
    }
    return [];
  }, []);

  /**
   * Save roll-over records to localStorage
   */
  const saveRolloverRecords = useCallback((checkInsData: CheckInData[]) => {
    try {
      // Only save roll-over records (those with rolloverTimestamp)
      const rolloverRecords = checkInsData.filter(c => c.rolloverTimestamp);
      localStorage.setItem('rolloverRecords', JSON.stringify(rolloverRecords));
    } catch (err) {
      console.error('Error saving roll-over records:', err);
    }
  }, []);

  /**
   * Fetches check-in data from the API with deduplication
   * Prevents duplicate API calls if one is already in progress
   */
  const fetchCheckIns = useCallback(async (force: boolean = false) => {
    // Avoid background polling when tab is hidden (WCAG-friendly: less noisy updates)
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && !force) {
      return;
    }

    // Exponential backoff after errors
    const nowTs = Date.now();
    if (!force && failureCount.current > 0) {
      const backoffMs = Math.min(30000, 2000 * Math.pow(2, failureCount.current - 1));
      const sinceError = nowTs - lastErrorTime.current;
      if (sinceError < backoffMs) {
        return;
      }
    }

    // Deduplication: Don't fetch if already in progress
    if (fetchInProgress.current && !force) {
      console.log('⏭️  Skipping fetch - already in progress');
      return;
    }
    
    // Deduplication: Don't fetch if recently fetched (within 5 seconds)
    const timeSinceLastFetch = nowTs - lastFetchTime.current;
    if (timeSinceLastFetch < 5000 && !force) {
      console.log('⏭️  Skipping fetch - fetched', Math.round(timeSinceLastFetch / 1000), 'seconds ago');
      return;
    }
    
    fetchInProgress.current = true;
    lastFetchTime.current = nowTs;
    
    try {
      const currentMode = isServiceTime() ? 'service' : 'off-hours';
      setRefreshMode(currentMode);
      
      console.log(`🔄 Fetching check-ins... [${currentMode} mode]`);
      
      const response = await fetchCheckins();
      const result = response;
      
      if (result.success) {
        // Reset backoff on success
        failureCount.current = 0;
        lastErrorTime.current = 0;

        // Load saved checked-out state and merge with fresh data
        const savedState = loadCheckedOutState();
        let mergedData = (result.data || []).map((checkIn: CheckInData) => {
          if (savedState[checkIn.id]) {
            return {
              ...checkIn,
              checkedOut: savedState[checkIn.id].checkedOut,
              checkOutTime: savedState[checkIn.id].checkOutTime
            };
          }
          return checkIn;
        });
        
        // ⭐ PRESERVE ROLL-OVER RECORDS: Keep any roll-over records from current state or localStorage
        setCheckIns(prevCheckIns => {
          // Get roll-over records from current state
          const currentRollovers = prevCheckIns.filter(c => c.rolloverTimestamp);
          
          // Also load saved roll-over records from localStorage (in case of page refresh)
          const savedRollovers = loadRolloverRecords();
          
          // Combine and deduplicate roll-over records
          const allRollovers = [...currentRollovers, ...savedRollovers];
          const rolloverMap = new Map<string, CheckInData>();
          allRollovers.forEach(rollover => {
            // Use the most recent version if there are duplicates
            const existing = rolloverMap.get(rollover.id);
            if (!existing || (rollover.rolloverTimestamp && existing.rolloverTimestamp && rollover.rolloverTimestamp > existing.rolloverTimestamp)) {
              rolloverMap.set(rollover.id, rollover);
            }
          });
          const rolloverRecords = Array.from(rolloverMap.values());
          
          // Create a map of existing check-in IDs from fresh data
          const existingIds = new Set(mergedData.map((c: CheckInData) => c.id));
          
          // ⭐ CLEAR OLD ROLL-OVERS: Only keep roll-overs from today
          // Get today's date at midnight (start of day) in local timezone
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStart = today.getTime();
          
          // Only keep roll-over records that aren't already in the fresh data
          // (in case the child was actually registered for that service)
          const preservedRollovers = rolloverRecords.filter(rollover => {
            // ⭐ CRITICAL: Filter out roll-overs from previous days
            // Roll-over records should only persist for the current service day
            if (rollover.rolloverTimestamp && rollover.rolloverTimestamp < todayStart) {
              console.log(`🗑️  Removing old roll-over record for ${rollover.childName} (from ${new Date(rollover.rolloverTimestamp).toLocaleDateString()})`);
              return false;
            }
            
            // Check if this roll-over is still valid (child not checked out, not no-show)
            const isStillActive = !rollover.checkedOut && rollover.status !== 'no-show';
            
            // Check if there's already a real check-in for this service
            const hasRealCheckIn = mergedData.some((c: CheckInData) => 
              c.securityCode === rollover.securityCode && 
              c.serviceName === rollover.serviceName &&
              !c.rolloverTimestamp // Only count real check-ins, not other roll-overs
            );
            
            return isStillActive && !hasRealCheckIn && !existingIds.has(rollover.id);
          });
          
          // Merge preserved roll-overs with fresh data
          const finalData = [...mergedData, ...preservedRollovers];
          
          // Save roll-over records for persistence
          saveRolloverRecords(finalData);
          
          // Detect multi-service kids (from Planning Center pre-registration)
          return detectMultiService(finalData);
        });
        
        setMode(result.mode ?? null);
        setLastUpdated(new Date());
        setError(null);
      } else {
        failureCount.current += 1;
        lastErrorTime.current = nowTs;
        setError(result.error || 'Failed to fetch check-ins');
      }
    } catch (err) {
      failureCount.current += 1;
      lastErrorTime.current = nowTs;
      console.error('Error fetching check-ins:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [loadCheckedOutState, loadRolloverRecords, saveRolloverRecords]);

  /**
   * Initial fetch on component mount
   */
  useEffect(() => {
    fetchCheckIns(true); // Force initial fetch
  }, [fetchCheckIns]);

  /**
   * Set up time-based auto-refresh with dynamic interval
   * Adjusts refresh rate based on service times
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const setupInterval = () => {
      // Clear existing interval
      if (interval) {
        clearInterval(interval);
      }
      
      // Get current refresh interval based on time
      const refreshInterval = getRefreshInterval();
      const mode = isServiceTime() ? 'service' : 'off-hours';
      
      console.log(`⏱️  Setting up auto-refresh: ${refreshInterval / 1000}s [${mode} mode]`);
      
      // Set up new interval
      interval = setInterval(() => {
        fetchCheckIns();
        
        // Check if we need to switch refresh intervals (e.g., service time ended)
        const newInterval = getRefreshInterval();
        if (newInterval !== refreshInterval) {
          console.log('🔄 Refresh interval changed, resetting timer...');
          setupInterval();
        }
      }, refreshInterval);
    };
    
    setupInterval();
    
    // Cleanup interval on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchCheckIns]);
  
  /**
   * Visibility-based refresh: Only fetch when tab is visible
   * Saves API calls when user is on another tab
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️  Tab became visible, refreshing data...');
        fetchCheckIns();
      } else {
        console.log('🙈 Tab hidden, pausing background refresh');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCheckIns]);

  /**
   * Formats the last updated time for display
   */
  const formatLastUpdated = (): string => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  /**
   * Get unique locations from check-ins data
   */
  const availableLocations = React.useMemo(() => {
    const locations = new Set<string>();
    
    // Add locations from actual check-ins
    checkIns.forEach(checkIn => {
      if (checkIn.locationName) {
        locations.add(checkIn.locationName);
      }
    });
    
    // Sort alphabetically
    return Array.from(locations).sort((a, b) => a.localeCompare(b));
  }, [checkIns]);

  /**
   * Get unique classrooms from check-ins data
   * Plus all standard event locations (since all campuses share the same classrooms)
   */
  const availableClassrooms = React.useMemo(() => {
    const classrooms = new Set<string>();
    
    // Add classrooms from actual check-ins
    checkIns.forEach(checkIn => {
      if (checkIn.className) {
        classrooms.add(checkIn.className);
      }
    });
    
    // Since all campuses share the same event locations, also include all standard classrooms
    // This ensures dropdown shows "Dreamers (0 kids)" even if no kids are checked in
    const standardClassrooms = ['Dreamers', 'Explorers', 'Heros', 'Legends', 'Club 456'];
    standardClassrooms.forEach(room => classrooms.add(room));
    
    // Sort by age order (youngest to oldest)
    const classroomOrder = ['Dreamers', 'Explorers', 'Heros', 'Legends', 'Club 456'];
    return Array.from(classrooms).sort((a, b) => {
      const indexA = classroomOrder.indexOf(a);
      const indexB = classroomOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
  }, [checkIns]);

  /**
   * Get location options based on user role and available data
   */
  const locationOptions = React.useMemo(() => {
    if (!userProfile) return ['All'];
    
    // Teachers only see their assigned location (no "All" option)
    if (userProfile.role === 'teacher' && userProfile.assignedLocation) {
      return [userProfile.assignedLocation];
    }
    
    // Admins see all locations from actual data, including "All"
    return ['All', ...availableLocations];
  }, [userProfile, availableLocations]);

  /**
   * Get classroom options based on user role and available data
   */
  const classroomOptions = React.useMemo(() => {
    if (!userProfile) return ['All'];
    
    // Teachers only see their assigned classroom (no "All" option)
    if (userProfile.role === 'teacher' && userProfile.assignedClassroom) {
      return [userProfile.assignedClassroom];
    }
    
    // Admins see all classrooms from actual data, including "All"
    return ['All', ...availableClassrooms];
  }, [userProfile, availableClassrooms]);

  /**
   * Auto-set location and classroom for teachers when profile loads
   */
  useEffect(() => {
    if (userProfile?.role === 'teacher') {
      if (userProfile.assignedLocation) {
        setSelectedLocation(userProfile.assignedLocation);
      }
      if (userProfile.assignedClassroom) {
        setSelectedClassroom(userProfile.assignedClassroom);
      }
    }
  }, [userProfile]);

  /**
   * Auto-scroll selected service time button into view
   * Triggers when: service time changes, tab changes, or filters change
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Use requestAnimationFrame to ensure DOM is fully rendered, then add a small delay
    const frameId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => {
        // Determine which container is currently visible based on active tab
        let activeContainer: HTMLDivElement | null = null;
        
        if (activeAdminTab === 'overview') {
          activeContainer = overviewServiceTimeScrollRef.current;
        } else if (activeAdminTab === 'checkins') {
          activeContainer = checkInsServiceTimeScrollRef.current;
        }
        
        // Also check both containers if we're not sure (e.g., initial load)
        const containersToCheck = activeContainer 
          ? [activeContainer]
          : [
              overviewServiceTimeScrollRef.current,
              checkInsServiceTimeScrollRef.current
            ].filter(Boolean) as HTMLDivElement[];

        containersToCheck.forEach(container => {
          if (!container) return;
          
          // Check if container is visible (not hidden)
          const isVisible = container.offsetParent !== null;
          if (!isVisible) return;
          
          // Find the selected button within this container
          const selectedButton = container.querySelector(
            `button[data-service-time="${selectedServiceTime}"]`
          ) as HTMLButtonElement;
          
          if (selectedButton) {
            // Scroll the button into view with smooth behavior
            selectedButton.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center'
            });
          }
        });
      }, 100);
    });

    return () => {
      cancelAnimationFrame(frameId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedServiceTime, activeAdminTab, selectedLocation, selectedClassroom]);

  /**
   * Handle setup modal completion
   */
  const handleSetupComplete = () => {
    const profile = loadUserProfile();
    if (profile) {
      setUserProfile(profile);
      if (profile.role === 'teacher') {
        if (profile.assignedLocation) {
          setSelectedLocation(profile.assignedLocation);
        }
        if (profile.assignedClassroom) {
          setSelectedClassroom(profile.assignedClassroom);
        }
      }
    }
    setShowSetupModal(false);
  };

  /**
   * Handle profile change/logout
   */
  const handleChangeProfile = () => {
    // Just show the modal - don't clear profile until user submits
    setShowSetupModal(true);
  };

  /**
   * Handle modal close without completing setup
   */
  const handleModalClose = () => {
    // Just close the modal - profile unchanged
    setShowSetupModal(false);
  };

  /**
   * Extract unique service times from check-ins and sort chronologically
   * IMPORTANT: Filter by selected location so service times match the location's schedule
   * For teachers: Exclude "All" option and only show their specific service times
   */
  const serviceTimes = React.useMemo(() => {
    const times = new Set<string>();
    
    // Filter check-ins by selected location first
    const locationCheckIns = selectedLocation === 'All' 
      ? checkIns 
      : checkIns.filter(checkIn => checkIn.locationName === selectedLocation);
    
    locationCheckIns.forEach(checkIn => {
      // Extract just the time portion (e.g., "8:00 AM Service" -> "8:00 AM")
      const match = checkIn.serviceName.match(/(\d{1,2}:\d{2}\s?[AP]M)/i);
      if (match) {
        times.add(match[1].toUpperCase());
      }
    });
    
    // Sort times chronologically
    const sortedTimes = Array.from(times).sort((a, b) => {
      const parseTime = (time: string) => {
        const match = time.match(/(\d{1,2}):(\d{2})\s?([AP]M)/i);
        if (!match) return 0;
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      };
      
      return parseTime(a) - parseTime(b);
    });
    
    // Teachers don't see "All" option - only specific service times
    if (userProfile?.role === 'teacher') {
      return sortedTimes;
    }
    
    // Admins see "All" option plus specific times
    return ['All', ...sortedTimes];
  }, [checkIns, selectedLocation, userProfile]);

  /**
   * Auto-select first service time for teachers if "All" is selected
   * (since teachers don't have "All" option)
   */
  useEffect(() => {
    if (userProfile?.role === 'teacher' && selectedServiceTime === 'All' && serviceTimes.length > 0) {
      // Auto-select the first (earliest) service time
      setSelectedServiceTime(serviceTimes[0]);
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedServiceTime', serviceTimes[0]);
      }
    }
  }, [userProfile, serviceTimes, selectedServiceTime]);

  /**
   * Filter check-ins including both active AND checked-out kids (for stats calculation)
   */
  const allFilteredCheckIns = React.useMemo(() => {
    return checkIns.filter(checkIn => {
      // Filter by location
      // If locationName is missing/undefined and filter is 'All', include it
      // If locationName is missing and filter is NOT 'All', exclude it
      const matchesLocation = selectedLocation === 'All' || 
        (checkIn.locationName && checkIn.locationName === selectedLocation);
      
      // Filter by classroom
      const matchesClassroom = selectedClassroom === 'All' || 
        (checkIn.className && checkIn.className === selectedClassroom);
      
      // Filter by service time
      const matchesServiceTime = selectedServiceTime === 'All' || 
        (checkIn.serviceName && checkIn.serviceName.toUpperCase().includes(selectedServiceTime));
      
      return matchesLocation && matchesClassroom && matchesServiceTime;
    });
  }, [checkIns, selectedLocation, selectedClassroom, selectedServiceTime]);

  /**
   * Filter for active check-ins only (for display in main table)
   * Excludes checked-out kids and no-shows
   */
  const filteredCheckIns = React.useMemo(() => {
    return allFilteredCheckIns.filter(checkIn => !checkIn.checkedOut && checkIn.status !== 'no-show');
  }, [allFilteredCheckIns]);

  /**
   * Calculate statistics based on ALL filtered check-ins (including checked-out)
   * This ensures counts accurately reflect the current view
   */
  const stats = React.useMemo(() => {
    // Exclude no-shows from all counts (they didn't actually show up to the classroom)
    const actualCheckIns = allFilteredCheckIns.filter(c => c.status !== 'no-show');
    const total = actualCheckIns.length;
    const checkedOut = actualCheckIns.filter(c => c.checkedOut).length;
    const checkedIn = total - checkedOut;
    return { total, checkedIn, checkedOut };
  }, [allFilteredCheckIns]);

  /**
   * Detect multi-service kids (pre-registered for multiple services via Planning Center)
   * @param checkIns - Array of check-in data
   * @returns Array with isMultiService flag set for kids appearing in multiple services
   */
  const detectMultiService = useCallback((checkIns: CheckInData[]): CheckInData[] => {
    // Group by security code
    const groupedByCode = new Map<string, CheckInData[]>();
    
    checkIns.forEach(checkIn => {
      const existing = groupedByCode.get(checkIn.securityCode) || [];
      groupedByCode.set(checkIn.securityCode, [...existing, checkIn]);
    });
    
    // Mark kids appearing in multiple services (but not rolled-over ones)
    return checkIns.map(checkIn => {
      const allInstances = groupedByCode.get(checkIn.securityCode) || [];
      // Only count instances that are NOT roll-overs (original Planning Center registrations)
      const nonRolloverInstances = allInstances.filter(c => !c.rolledOverFrom);
      const uniqueServices = new Set(nonRolloverInstances.map(c => c.serviceName)).size;
      
      return {
        ...checkIn,
        // Flag as multi-service if they're in 2+ services (and this isn't a roll-over)
        isMultiService: uniqueServices > 1 && !checkIn.rolledOverFrom
      };
    });
  }, []);

  /**
   * Helper: Get next service time from current service
   * Uses location-specific service times to ensure correct rollover
   * @returns Next service name or null if already at last service
   */
  const getNextService = useCallback((currentService: string, locationName?: string): string | null => {
    // Extract the location/event name from current service
    // Format: "Sunday Services – Heights • 8:00 AM" -> "Sunday Services – Heights"
    const timeMatch = currentService.match(/(\d{1,2}:\d{2}\s?[AP]M)/i);
    if (!timeMatch) return null;
    
    const eventName = currentService.substring(0, timeMatch.index).trim().replace(/\s*•\s*$/, '').trim();
    const currentTime = timeMatch[1];
    
    // Get location-specific service times from check-ins
    // Find all unique service times for this location
    const locationServices = new Set<string>();
    checkIns.forEach(checkIn => {
      if (checkIn.locationName === locationName && checkIn.serviceName) {
        const serviceTimeMatch = checkIn.serviceName.match(/(\d{1,2}:\d{2}\s?[AP]M)/i);
        if (serviceTimeMatch) {
          locationServices.add(serviceTimeMatch[1]);
        }
      }
    });
    
    // Convert to sorted array
    const services = Array.from(locationServices).sort((a, b) => {
      const parseTime = (time: string) => {
        const match = time.match(/(\d{1,2}):(\d{2})\s?([AP]M)/i);
        if (!match) return 0;
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      return parseTime(a) - parseTime(b);
    });
    
    // Find current time in the location's service list
    const currentIndex = services.findIndex(s => currentTime.toUpperCase().includes(s.toUpperCase()) || s.toUpperCase().includes(currentTime.toUpperCase()));
    if (currentIndex === -1 || currentIndex >= services.length - 1) return null;
    
    const nextTime = services[currentIndex + 1];
    return `${eventName} • ${nextTime}`;
  }, [checkIns]);

  /**
   * Handle undo roll-over by deleting the newly created records
   */
  const handleUndoRollOver = useCallback((rolloverTimestamp: number) => {
    setCheckIns(prevCheckIns => {
      // Remove all records created in this roll-over action
      const updated = prevCheckIns.filter(
        c => c.rolloverTimestamp !== rolloverTimestamp
      );
      
      saveCheckedOutState(updated);
      saveRolloverRecords(updated); // Update roll-over records
      return updated;
    });
    
    setToast(null); // Clear toast
  }, [saveCheckedOutState, saveRolloverRecords]);

  /**
   * Handle roll-over to next service with deduplication
   * If currentServiceName is provided, only roll over kids from that specific service
   * This prevents rolling over kids from other service times when they're checked into multiple services
   */
  const handleRollOver = useCallback((securityCode: string, currentServiceName?: string) => {
    setCheckIns(prevCheckIns => {
      // 1. Find kids to roll over (active, not checked out, not no-show)
      // CRITICAL: If currentServiceName is provided, only roll over kids from that specific service
      const kidsToRollOver = prevCheckIns.filter(
        c => c.securityCode === securityCode && 
             !c.checkedOut && 
             c.status !== 'no-show' &&
             (!currentServiceName || c.serviceName === currentServiceName) // Only from current service if specified
      );
      
      if (kidsToRollOver.length === 0) return prevCheckIns;
      
      const currentService = kidsToRollOver[0].serviceName;
      const locationName = kidsToRollOver[0].locationName;
      const nextService = getNextService(currentService, locationName);
      
      if (!nextService) {
        setToast({ 
          message: '⚠️ Already at final service - cannot roll over',
          duration: 3000 
        });
        return prevCheckIns;
      }
      
      // 2. ⭐ DEDUPLICATION: Check if already registered for next service
      // Only check for duplicates in the NEXT service, not other services
      const alreadyRegistered = prevCheckIns.some(
        c => c.securityCode === securityCode && 
             c.serviceName === nextService &&
             c.status !== 'no-show' &&
             // CRITICAL: Don't count the current service's records as duplicates
             c.serviceName !== currentService
      );
      
      if (alreadyRegistered) {
        const familyName = kidsToRollOver[0].familyName;
        const count = kidsToRollOver.length;
        
        // Show helpful message instead of creating duplicate
        setToast({ 
          message: `✓ ${familyName} family already registered for ${nextService} (${count} ${count === 1 ? 'kid' : 'kids'})`,
          duration: 3000 
        });
        
        // Don't create new records!
        return prevCheckIns;
      }
      
      // 3. Create new roll-over records
      const rolloverTimestamp = Date.now();
      const newCheckIns = kidsToRollOver.map(kid => ({
        ...kid,
        id: `rollover-${kid.id}-${rolloverTimestamp}`,
        serviceName: nextService,
        rolledOverFrom: currentService,
        originalCheckInTime: kid.checkInTime,
        checkInTime: new Date().toISOString(),
        rolloverTimestamp,
      }));
      
      const updated = [...prevCheckIns, ...newCheckIns];
      saveCheckedOutState(updated);
      saveRolloverRecords(updated); // Save roll-over records for persistence
      
      const familyName = kidsToRollOver[0].familyName;
      const count = kidsToRollOver.length;
      
      // Show toast with undo option
      setToast({ 
        message: `${familyName} family rolled to ${nextService} (${count} ${count === 1 ? 'kid' : 'kids'})`,
        onUndo: () => handleUndoRollOver(rolloverTimestamp)
      });
      
      return updated;
    });
  }, [saveCheckedOutState, saveRolloverRecords, getNextService, handleUndoRollOver]);

  /**
   * Handle check-in (reverse check-out) for a family
   */
  const handleCheckIn = useCallback((securityCode: string) => {
    setCheckIns(prevCheckIns => {
      const updated = prevCheckIns.map(checkIn => 
        checkIn.securityCode === securityCode && checkIn.checkedOut
          ? { ...checkIn, checkedOut: false, checkOutTime: undefined }
          : checkIn
      );
      
      // Save to localStorage
      saveCheckedOutState(updated);
      return updated;
    });
    // Remove from recent tray when undone
    setRecentCheckouts(prev => prev.filter(item => item.securityCode !== securityCode));
    setToast(null); // Clear any existing toast
  }, [saveCheckedOutState]);

  /**
   * Handle check-out for a family (all siblings with same security code)
   * Checks out ALL instances across ALL services (including rolled-over kids)
   */
  const handleCheckOut = useCallback((securityCode: string) => {
    setCheckIns(prevCheckIns => {
      // Get ALL active kids to check out from CURRENT state (across all services)
      const kidsToCheckOut = prevCheckIns.filter(
        c => c.securityCode === securityCode && !c.checkedOut && c.status !== 'no-show'
      );
      
      const count = kidsToCheckOut.length;
      const familyName = kidsToCheckOut[0]?.familyName || '';
      
      // Count unique services (for multi-service message)
      const uniqueServices = new Set(kidsToCheckOut.map(k => k.serviceName)).size;

      // Track recent check-outs (for sticky tray)
      const timestamp = new Date().toISOString();
      if (kidsToCheckOut.length > 0) {
        setRecentCheckouts(prev => {
          const updated = [
            { securityCode, kids: kidsToCheckOut, timestamp },
            ...prev.filter(item => item.securityCode !== securityCode),
          ].slice(0, 5);
          return updated;
        });
      }
      
      // Check out ALL instances with this security code across all services
      const updated = prevCheckIns.map(checkIn => 
        checkIn.securityCode === securityCode && !checkIn.checkedOut && checkIn.status !== 'no-show'
          ? { ...checkIn, checkedOut: true, checkOutTime: new Date().toISOString() }
          : checkIn
      );
      
      // Save to localStorage
      saveCheckedOutState(updated);
      
      // Enhanced toast message for multi-service kids
      const message = uniqueServices > 1
        ? `${familyName} family checked out (${count} ${count === 1 ? 'kid' : 'kids'} across ${uniqueServices} services)`
        : count === 1 
          ? `${kidsToCheckOut[0].childName} checked out`
          : `${familyName} family checked out (${count} ${count === 1 ? 'kid' : 'kids'})`;
        
      setToast({
        message,
        onUndo: () => handleCheckIn(securityCode),
      });
      
      return updated;
    });
  }, [saveCheckedOutState, handleCheckIn]);

  /**
   * Handle undo dismiss (reverse no-show status) for a family
   * If currentServiceName is provided:
   *   - Finds the dismissTime for that service
   *   - Undoes all no-shows with the same dismissTime (including cascaded services)
   * If currentServiceName is NOT provided, undoes all no-shows for that security code
   */
  const handleUndoDismiss = useCallback((securityCode: string, currentServiceName?: string) => {
    setCheckIns(prevCheckIns => {
      // If no service name provided, undo all no-shows for this security code
      if (!currentServiceName) {
        const updated = prevCheckIns.map(checkIn => {
          const matches = checkIn.securityCode === securityCode && checkIn.status === 'no-show';
          return matches
            ? { ...checkIn, status: 'active' as const, dismissTime: undefined }
            : checkIn;
        });
        
        saveCheckedOutState(updated);
        return updated;
      }
      
      // Find the dismissTime for the current service (to undo all cascaded services)
      const currentServiceCheckIn = prevCheckIns.find(
        c => c.securityCode === securityCode && 
             c.serviceName === currentServiceName && 
             c.status === 'no-show'
      );
      
      if (!currentServiceCheckIn || !currentServiceCheckIn.dismissTime) {
        // No matching no-show found, nothing to undo
        return prevCheckIns;
      }
      
      const dismissTimeToUndo = currentServiceCheckIn.dismissTime;
      
      // Undo all no-shows with the same dismissTime (this includes the cascaded services)
      const updated = prevCheckIns.map(checkIn => {
        const matches = checkIn.securityCode === securityCode && 
                        checkIn.status === 'no-show' &&
                        checkIn.dismissTime === dismissTimeToUndo;
        return matches
          ? { ...checkIn, status: 'active' as const, dismissTime: undefined }
          : checkIn;
      });
      
      // Save to localStorage
      saveCheckedOutState(updated);
      return updated;
    });
    setToast(null); // Clear any existing toast
  }, [saveCheckedOutState]);

  /**
   * Parse service time from service name and convert to minutes for chronological comparison
   * Service names are in format: "Location Name • 8:00 AM" or just "8:00 AM"
   */
  const parseServiceTime = useCallback((serviceName: string): number => {
    // Extract time portion from service name (e.g., "8:00 AM" from "South Tampa • 8:00 AM")
    const match = serviceName.match(/(\d{1,2}):(\d{2})\s?([AP]M)/i);
    if (!match) return 0; // If no time found, return 0 (will be treated as earliest)
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    // Return total minutes for easy comparison
    return hours * 60 + minutes;
  }, []);

  /**
   * Service time options for the checkout list (dynamic, based on checked-out items)
   * Sorted from earliest to latest, with "All" prepended.
   */
  const checkoutServiceOptions = React.useMemo(() => {
    const parseTime = (time: string): number => {
      const match = time.match(/(\d{1,2}):(\d{2})\s?([AP]M)/i);
      if (!match) return 0;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const times = checkIns
      .filter(c => c.checkedOut)
      .map(c => {
        const match = c.serviceName?.match(/(\d{1,2}:\d{2}\s?[AP]M)/i);
        return match ? match[1].toUpperCase() : c.serviceTime?.toUpperCase() || '';
      })
      .filter(Boolean);

    const unique = Array.from(new Set(times));
    unique.sort((a, b) => parseTime(a) - parseTime(b));
    return ['All', ...unique];
  }, [checkIns]);

  /**
   * Keep checkout filter valid when available service options change
   */
  useEffect(() => {
    if (!checkoutServiceOptions.includes(checkoutServiceTime) && checkoutServiceTime !== 'All') {
      setCheckoutServiceTime('All');
    }
  }, [checkoutServiceOptions, checkoutServiceTime]);

  /**
   * Handle dismiss (mark as no-show) for a family
   * If currentServiceName is provided:
   *   - Marks the current service as no-show
   *   - Automatically cascades to all later services (chronologically) for the same security code
   *   - Does NOT mark earlier services (they may have already attended)
   * If currentServiceName is NOT provided, marks all services (backward compatibility)
   */
  const handleDismiss = useCallback((securityCode: string, currentServiceName?: string) => {
    setCheckIns(prevCheckIns => {
      const dismissTime = new Date().toISOString();
      
      // If no service name provided, mark all services (backward compatibility)
      if (!currentServiceName) {
        const family = prevCheckIns.filter(
          c => c.securityCode === securityCode && 
               !c.checkedOut && 
               c.status !== 'no-show'
        );
        const count = family.length;
        const familyName = family[0]?.familyName || '';
        
        const updated = prevCheckIns.map(checkIn => {
          const matches = checkIn.securityCode === securityCode && 
                          !checkIn.checkedOut && 
                          checkIn.status !== 'no-show';
          return matches
            ? { ...checkIn, status: 'no-show', dismissTime }
            : checkIn;
        });
        
        saveCheckedOutState(updated);
        
        const message = count === 1 
          ? `${family[0].childName} marked as no-show`
          : `${familyName} family marked as no-show (${count} kids)`;
          
        setToast({
          message,
          onUndo: () => handleUndoDismiss(securityCode),
        });
        
        return updated;
      }
      
      // Service-specific dismiss with cascading to later services
      const currentServiceTime = parseServiceTime(currentServiceName);
      const familyName = prevCheckIns.find(c => c.securityCode === securityCode)?.familyName || '';
      
      // Find all check-ins to mark as no-show:
      // 1. Current service (exact match)
      // 2. All later services (chronologically) for the same security code
      const updated = prevCheckIns.map(checkIn => {
        if (checkIn.securityCode !== securityCode || 
            checkIn.checkedOut || 
            checkIn.status === 'no-show') {
          return checkIn; // Skip if wrong family, already checked out, or already no-show
        }
        
        const checkInServiceTime = parseServiceTime(checkIn.serviceName);
        const isCurrentService = checkIn.serviceName === currentServiceName;
        const isLaterService = checkInServiceTime > currentServiceTime;
        
        // Mark as no-show if it's the current service OR a later service
        if (isCurrentService || isLaterService) {
          return { ...checkIn, status: 'no-show', dismissTime };
        }
        
        return checkIn;
      });
      
      // Count how many were marked (for toast message)
      const markedCount = updated.filter(
        c => c.securityCode === securityCode && 
             c.status === 'no-show' && 
             c.dismissTime === dismissTime
      ).length;
      
      // Count unique services marked
      const markedServices = new Set(
        updated
          .filter(c => c.securityCode === securityCode && c.status === 'no-show' && c.dismissTime === dismissTime)
          .map(c => c.serviceName)
      ).size;
      
      saveCheckedOutState(updated);
      
      // Enhanced toast message showing cascade
      const message = markedServices > 1
        ? `${familyName} family marked as no-show for ${currentServiceName} and ${markedServices - 1} later service${markedServices - 1 === 1 ? '' : 's'} (${markedCount} ${markedCount === 1 ? 'kid' : 'kids'})`
        : markedCount === 1
          ? `${updated.find(c => c.securityCode === securityCode && c.status === 'no-show' && c.dismissTime === dismissTime)?.childName || familyName} marked as no-show for ${currentServiceName}`
          : `${familyName} family marked as no-show for ${currentServiceName} (${markedCount} ${markedCount === 1 ? 'kid' : 'kids'})`;
      
      setToast({
        message,
        onUndo: () => handleUndoDismiss(securityCode, currentServiceName), // Undo only the current service
      });
      
      return updated;
    });
  }, [saveCheckedOutState, handleUndoDismiss, parseServiceTime]);

  /**
   * Pull-to-refresh handlers for mobile
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only trigger if at top of page
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current === 0) return;
    
    const touchY = e.touches[0].clientY;
    const distance = touchY - pullStartY.current;
    
    // Only allow pulling down
    if (distance > 0 && window.scrollY === 0) {
      pullDistance.current = Math.min(distance, 120); // Max 120px pull
      if (pullDistance.current > 60) {
        setIsPulling(true);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance.current > 60) {
      // Trigger refresh
      fetchCheckIns(true);
    }
    
    // Reset
    pullStartY.current = 0;
    pullDistance.current = 0;
    setIsPulling(false);
  }, [fetchCheckIns]);

  /**
   * Hidden system reset Easter egg
   * Click title 5 times to reveal reset button
   */
  const handleTitleClick = useCallback(() => {
    setTitleClickCount(prev => {
      const newCount = prev + 1;
      
      // Show reset button after 5 clicks
      if (newCount >= 5) {
        setShowResetButton(true);
        
        // Auto-hide button after 10 seconds
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
        }
        resetTimerRef.current = setTimeout(() => {
          setShowResetButton(false);
          setTitleClickCount(0);
        }, 10000);
        
        return 0; // Reset counter
      }
      
      return newCount;
    });
  }, []);

  /**
   * Handle system reset - clears all localStorage and reloads
   */
  const handleSystemReset = useCallback(() => {
    if (confirm('🔄 Reset System?\n\nThis will clear all cached data and reload the dashboard.\n\nAre you sure?')) {
      // Clear all localStorage
      localStorage.clear();
      
      // Show confirmation toast
      setToast({
        message: '✅ System reset complete! Reloading...',
      });
      
      // Reload page after 1 second
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, []);

  // Cleanup reset timer on unmount
  useEffect(() => {
    // Auto-prune recent check-outs after 7 minutes
    const MAX_AGE_MS = 7 * 60 * 1000;
    pruneRecentTimerRef.current = setInterval(() => {
      setRecentCheckouts(prev => {
        const now = Date.now();
        return prev.filter(item => now - new Date(item.timestamp).getTime() < MAX_AGE_MS);
      });
    }, 60 * 1000);

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      if (pruneRecentTimerRef.current) {
        clearInterval(pruneRecentTimerRef.current);
      }
    };
  }, []);

  const getActiveCountForServiceTime = useCallback(
    (time: string) => {
      if (checkIns.length === 0) return 0;
      if (time === 'All') {
        return checkIns.filter(
          (c) =>
            !c.checkedOut &&
            c.status !== 'no-show' &&
            (selectedLocation === 'All' || c.locationName === selectedLocation) &&
            (selectedClassroom === 'All' || c.className === selectedClassroom)
        ).length;
      }
      return checkIns.filter(
        (c) =>
          !c.checkedOut &&
          c.status !== 'no-show' &&
          c.serviceName.toUpperCase().includes(time) &&
          (selectedLocation === 'All' || c.locationName === selectedLocation) &&
          (selectedClassroom === 'All' || c.className === selectedClassroom)
      ).length;
    },
    [checkIns, selectedLocation, selectedClassroom]
  );

  const statsBarItems = [
    { label: 'Checked In', value: stats.checkedIn, accent: 'primary' as const, icon: 'checked-in' as const },
    { label: 'Checked Out', value: stats.checkedOut, accent: 'muted' as const, icon: 'checked-out' as const },
    { label: 'Total Kids', value: stats.total, accent: 'default' as const, icon: 'total' as const },
  ];

  return (
    <>
      <Head>
        <title>Radiant Kids Check-In Dashboard</title>
        <meta
          name="description"
          content="Live classroom dashboard for Radiant Kids check-ins"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.ico`} />
      </Head>

      {/* Setup Modal for first-time users */}
      {showSetupModal && (
        <SetupModal
          onComplete={handleSetupComplete} 
          onClose={handleModalClose}
          availableClassrooms={availableClassrooms}
          availableLocations={availableLocations}
          currentProfile={userProfile}
        />
      )}

      <main
        className="min-h-screen bg-canvas-parchment relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {isPulling && (
          <div className="fixed top-0 left-0 right-0 flex justify-center pt-lg z-40">
            <div className="btn-primary flex items-center gap-xs animate-pulse">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Release to refresh
            </div>
          </div>
        )}

        <div className="max-w-content mx-auto relative z-10">
          {/* Global nav */}
          <header className="global-nav flex items-center justify-between sticky top-0 z-30">
            <span className="font-text text-nav-link text-on-dark tracking-tight">Radiant Kids</span>
            <span className="font-text text-fine-print text-body-muted hidden sm:inline">Check-In Dashboard</span>
          </header>

          {/* Sub-nav + page title */}
          <div className="sub-nav-frosted mb-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm flex-wrap">
                    <h1
                    className="font-display text-display-md text-ink cursor-pointer select-none"
                    onClick={handleTitleClick}
                  >
                    Check-In
                  </h1>
                  {showResetButton && (
                    <button
                      onClick={handleSystemReset}
                      className="btn-dark-utility !bg-red-700 animate-scale-in flex items-center gap-xs"
                      title="Clear all cached data and reload"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        System Reset
                      </button>
                    )}
                  </div>
                {userProfile && (
                  <div className="flex items-center gap-sm flex-wrap mt-xs">
                    {userProfile.role === 'teacher' && userProfile.assignedClassroom && (
                      <span className="btn-primary !py-xxs !px-sm text-caption-strong inline-flex items-center gap-xxs">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        {userProfile.assignedClassroom}
                      </span>
                    )}
                    <button type="button" onClick={handleChangeProfile} className="text-link text-caption">
                      Change profile
                    </button>
                  </div>
                )}
                {!userProfile && (
                  <p className="font-text text-body text-ink-muted-48 mt-xs">Live classroom attendance</p>
                )}
              </div>

              <div className="flex items-center gap-sm flex-wrap shrink-0">
                {mode && (
                  <span className="chip-option !py-xxs !px-sm text-fine-print">
                    {mode === 'mock' ? 'Mock' : 'Live'}
                  </span>
                )}
                <span
                  className="chip-option !py-xxs !px-sm text-fine-print"
                  title={refreshMode === 'service' ? 'Refreshing every 30 seconds' : 'Refreshing every 5 minutes'}
                >
                  {refreshMode === 'service' ? 'Service time' : 'Off-hours'}
                </span>
                <div className="flex items-center gap-xs font-text text-caption text-ink-muted-80">
                    {loading && checkIns.length > 0 && (
                      <svg
                        className="w-4 h-4 animate-spin text-ink-muted-48"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )}
                  <span className="font-text text-caption-strong">{formatLastUpdated()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-md sm:px-lg pb-xl">

          {/* Admin Tabs and Content */}
          {userProfile?.role === 'admin' ? (
            <>
              {/* Tab Navigation */}
              <div className="mb-md">
                <nav className="flex gap-xs p-xs bg-canvas rounded-lg border border-hairline">
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab('overview')}
                      className={`flex items-center gap-xs px-md py-xs rounded-pill font-text text-caption transition-all active:scale-[0.98] ${
                        activeAdminTab === 'overview'
                          ? 'bg-primary text-on-primary'
                          : 'text-ink-muted-80 hover:bg-canvas-parchment'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab('checkins')}
                      className={`flex items-center gap-xs px-md py-xs rounded-pill font-text text-caption transition-all active:scale-[0.98] ${
                        activeAdminTab === 'checkins'
                          ? 'bg-primary text-on-primary'
                          : 'text-ink-muted-80 hover:bg-canvas-parchment'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Check-Ins
                      {checkIns.length > 0 && (
                        <span className={`ml-xs px-sm py-xxs rounded-pill font-text text-fine-print ${
                          activeAdminTab === 'checkins'
                            ? 'bg-white/20'
                            : 'bg-canvas-parchment text-primary'
                        }`}>
                          {checkIns.filter(c => !c.checkedOut).length}
                        </span>
                      )}
                    </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeAdminTab === 'overview' ? (
                // Overview Tab - AdminStats
                <AdminStats 
                  checkIns={checkIns}
                  selectedLocation={selectedLocation}
                  onLocationChange={(location) => {
                    setSelectedLocation(location);
                    localStorage.setItem('selectedLocation', location);
                  }}
                  locationOptions={locationOptions}
                  onClassroomClick={(classroom) => {
                    setSelectedClassroom(classroom);
                    setActiveAdminTab('checkins');
                    // Scroll to top after switching tabs
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 100);
                  }}
                />
              ) : (
                // Check-Ins Tab - Filters and Table
                <>
                  {/* Filters and Stats */}
                  <div id="filters-section" className="mb-md">
            <div className="card-utility !p-md">
              {/* Location & Classroom Dropdowns (Admin Only - Side by Side) */}
              {userProfile?.role === 'admin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-lg">
                  <div>
                    <label htmlFor="location-select" className="flex items-center gap-xs font-text text-caption-strong text-ink mb-xs">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      Location
                    </label>
                    <select
                      id="location-select"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className={FILTER_SELECT_CLASS}
                    >
                      {locationOptions.map((location) => {
                        const count = location === 'All'
                          ? checkIns.filter(c => !c.checkedOut && c.status !== 'no-show' && 
                              (selectedClassroom === 'All' || c.className === selectedClassroom) &&
                              (selectedServiceTime === 'All' || c.serviceName.toUpperCase().includes(selectedServiceTime))
                            ).length
                          : checkIns.filter(c => 
                              !c.checkedOut &&
                              c.status !== 'no-show' &&
                              c.locationName === location && 
                              (selectedClassroom === 'All' || c.className === selectedClassroom) &&
                              (selectedServiceTime === 'All' || c.serviceName.toUpperCase().includes(selectedServiceTime))
                            ).length;
                        return (
                          <option key={location} value={location}>
                            {location} ({count} {count === 1 ? 'kid' : 'kids'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="classroom-select" className="flex items-center gap-xs font-text text-caption-strong text-ink mb-xs">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      Classroom
                    </label>
                    <select
                      id="classroom-select"
                      value={selectedClassroom}
                      onChange={(e) => setSelectedClassroom(e.target.value)}
                      className={FILTER_SELECT_CLASS}
                    >
                      {classroomOptions.map((classroom) => {
                        const count = classroom === 'All'
                          ? checkIns.filter(c => !c.checkedOut && c.status !== 'no-show' && 
                              (selectedLocation === 'All' || c.locationName === selectedLocation) &&
                              (selectedServiceTime === 'All' || c.serviceName.toUpperCase().includes(selectedServiceTime))
                            ).length
                          : checkIns.filter(c => 
                              !c.checkedOut &&
                              c.status !== 'no-show' &&
                              c.className === classroom && 
                              (selectedLocation === 'All' || c.locationName === selectedLocation) &&
                              (selectedServiceTime === 'All' || c.serviceName.toUpperCase().includes(selectedServiceTime))
                            ).length;
                        return (
                          <option key={classroom} value={classroom}>
                            {classroom} ({count} {count === 1 ? 'kid' : 'kids'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
                <ServiceTimeFilterRow
                  serviceTimes={serviceTimes}
                  selectedServiceTime={selectedServiceTime}
                  onSelect={setSelectedServiceTime}
                  getCount={getActiveCountForServiceTime}
                  scrollRef={overviewServiceTimeScrollRef}
                />
                <StatsBar stats={statsBarItems} />
              </div>
            </div>
          </div>

                  {/* Main Content */}
                  <div className="mb-6">
                    {loading && checkIns.length === 0 ? (
                      // Initial loading state
                      <Loader />
                    ) : error ? (
                      // Error state
                      <div className="card-utility text-center border-red-300">
                        <svg
                          className="mx-auto h-16 w-16 text-red-500 mb-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <h3 className="font-text text-body-strong text-ink mb-sm">
                          Error Loading Check-Ins
                        </h3>
                        <p className="font-text text-body text-ink-muted-80 mb-md">{error}</p>
                        <p className="font-text text-caption text-ink-muted-48">
                          Dashboard will automatically retry in a few seconds...
                        </p>
                      </div>
                    ) : filteredCheckIns.length === 0 ? (
                      // Empty state - no active check-ins
                      <div className="card-utility text-center py-section">
                        <svg
                          className="mx-auto h-24 w-24 text-ink-muted-48 mb-lg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <h3 className="font-display text-display-md text-ink mb-sm">
                          No Check-Ins
                        </h3>
                        <p className="font-text text-body text-ink-muted-48">
                          {checkIns.length > 0 
                            ? 'All kids have been checked out for this service.'
                            : 'No kids are currently checked in.'}
                        </p>
                      </div>
                    ) : (
                      // Success state - display check-ins
                      <CheckInTable 
                        checkIns={filteredCheckIns}
                        allCheckIns={allFilteredCheckIns}
                        selectedLocation={selectedLocation}
                        userRole={userProfile?.role}
                        onCheckOut={handleCheckOut}
                        onCheckIn={handleCheckIn}
                        onDismiss={handleDismiss}
                        onRollOver={handleRollOver}
                      />
                    )}
                  </div>

                  {/* Checked-Out List - Below main table (filtered by current service/classroom) */}
                  <CheckedOutList
                    checkedOutKids={checkIns.filter(checkIn => {
                      if (!checkIn.checkedOut) return false;
                      
                      // Apply same filters as main table
                      const matchesLocation = selectedLocation === 'All' || checkIn.locationName === selectedLocation;
                      const matchesClassroom = selectedClassroom === 'All' || checkIn.className === selectedClassroom;
                      const matchesServiceTime = checkoutServiceTime === 'All' ||
                        checkIn.serviceName.toUpperCase().includes(checkoutServiceTime);
                      
                      return matchesLocation && matchesClassroom && matchesServiceTime;
                    })}
                    onUndo={handleCheckIn}
                    selectedServiceTime={checkoutServiceTime}
                    selectedLocation={selectedLocation}
                    serviceTimeOptions={checkoutServiceOptions}
                    onServiceTimeChange={(time) => setCheckoutServiceTime(time)}
                  />
                </>
              )}
            </>
          ) : userProfile?.role === 'teacher' ? (
            // Teacher View - No tabs, direct filters and content
            <>
              {/* Filters and Stats */}
              <div id="filters-section" className="mb-md">
                <div className="card-utility !p-md">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
                    <ServiceTimeFilterRow
                      serviceTimes={serviceTimes}
                      selectedServiceTime={selectedServiceTime}
                      onSelect={setSelectedServiceTime}
                      getCount={getActiveCountForServiceTime}
                      scrollRef={checkInsServiceTimeScrollRef}
                    />
                    <StatsBar stats={statsBarItems} />
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="mb-6">
                {loading && checkIns.length === 0 ? (
                  // Initial loading state
                  <Loader />
                ) : error ? (
                  // Error state
                  <div className="card-utility text-center border-red-300">
                    <svg
                      className="mx-auto h-16 w-16 text-red-500 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-xl font-semibold text-red-800 mb-2">
                      Error Loading Check-Ins
                    </h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <p className="text-sm text-gray-600">
                      Dashboard will automatically retry in a few seconds...
                    </p>
                  </div>
                ) : filteredCheckIns.length === 0 ? (
                  // Empty state - no active check-ins
                  <div className="card-utility text-center py-section">
                    <svg
                      className="mx-auto h-24 w-24 text-gray-400 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                      No Check-Ins
                    </h3>
                    <p className="text-gray-500">
                      {checkIns.length > 0 
                        ? 'All kids have been checked out for this service.'
                        : 'No kids are currently checked in.'}
                    </p>
                  </div>
                ) : (
                  // Success state - display check-ins
                  <CheckInTable 
                    checkIns={filteredCheckIns}
                    selectedLocation={selectedLocation}
                    userRole={userProfile?.role}
                    onCheckOut={handleCheckOut}
                    onCheckIn={handleCheckIn}
                    onDismiss={handleDismiss}
                    onRollOver={handleRollOver}
                  />
                )}
              </div>
            </>
          ) : null}

          {/* Checked-Out List - Only for Teacher View (Admin view already has it in the Check-Ins tab) */}
          {userProfile?.role === 'teacher' && (
            <CheckedOutList
              checkedOutKids={checkIns.filter(checkIn => {
                if (!checkIn.checkedOut) return false;
                
                // Apply same filters as main table
                const matchesLocation = selectedLocation === 'All' || checkIn.locationName === selectedLocation;
                const matchesClassroom = selectedClassroom === 'All' || checkIn.className === selectedClassroom;
                const matchesServiceTime = checkoutServiceTime === 'All' ||
                  checkIn.serviceName.toUpperCase().includes(checkoutServiceTime);
                
                return matchesLocation && matchesClassroom && matchesServiceTime;
              })}
              onUndo={handleCheckIn}
              selectedServiceTime={checkoutServiceTime}
              selectedLocation={selectedLocation}
              serviceTimeOptions={checkoutServiceOptions}
              onServiceTimeChange={(time) => setCheckoutServiceTime(time)}
            />
          )}
          
          {/* Recent check-outs tray (sticky) */}
          <RecentCheckoutsTray
            items={recentCheckouts}
            onUndo={handleCheckIn}
          />

          {/* Toast Notification */}
          {toast && (
            <Toast
              message={toast.message}
              onUndo={toast.onUndo}
              onClose={() => setToast(null)}
              duration={toast.duration ?? 5000}
            />
          )}

          {/* Footer with future features notice */}
          {/* <footer className="mt-8 md:mt-12 text-center text-gray-500 text-xs sm:text-sm">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">
                Coming Soon
              </h3>
              <ul className="space-y-1 text-left sm:text-center">
                <li>📱 Barcode/QR scanner for parent pickup</li>
                <li>📊 Export attendance reports (CSV)</li>
                <li>🗂️ Filter by classroom/location</li>
                <li>💬 Automated parent pickup reminders via text</li>
              </ul>
            </div>
          </footer> */}
          </div>
        </div>
      </main>
    </>
  );
}

