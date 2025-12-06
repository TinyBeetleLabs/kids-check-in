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
import { CheckInData, LOCATIONS } from '@/lib/mockData';
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
  const [refreshMode, setRefreshMode] = useState<'service' | 'off-hours'>('off-hours');
  const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [filtersLoaded, setFiltersLoaded] = useState<boolean>(false);
  
  // Hidden system reset (Easter egg)
  const [titleClickCount, setTitleClickCount] = useState<number>(0);
  const [showResetButton, setShowResetButton] = useState<boolean>(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for deduplication and visibility tracking
  const fetchInProgress = useRef<boolean>(false);
  const lastFetchTime = useRef<number>(0);
  
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
    // Deduplication: Don't fetch if already in progress
    if (fetchInProgress.current && !force) {
      console.log('⏭️  Skipping fetch - already in progress');
      return;
    }
    
    // Deduplication: Don't fetch if recently fetched (within 5 seconds)
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    if (timeSinceLastFetch < 5000 && !force) {
      console.log('⏭️  Skipping fetch - fetched', Math.round(timeSinceLastFetch / 1000), 'seconds ago');
      return;
    }
    
    fetchInProgress.current = true;
    lastFetchTime.current = now;
    
    try {
      const currentMode = isServiceTime() ? 'service' : 'off-hours';
      setRefreshMode(currentMode);
      
      console.log(`🔄 Fetching check-ins... [${currentMode} mode]`);
      
      const response = await fetch('/api/checkins');
      const result = await response.json();
      
      if (result.success) {
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
          
          // Only keep roll-over records that aren't already in the fresh data
          // (in case the child was actually registered for that service)
          const preservedRollovers = rolloverRecords.filter(rollover => {
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
        
        setMode(result.mode);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch check-ins');
      }
    } catch (err) {
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
            ? { ...checkIn, status: 'active', dismissTime: undefined }
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
          ? { ...checkIn, status: 'active', dismissTime: undefined }
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
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <Head>
        <title>Radiant Kids Check-In Dashboard</title>
        <meta
          name="description"
          content="Live classroom dashboard for Radiant Kids check-ins"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
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
        className="min-h-screen p-4 sm:p-6 md:p-8 lg:p-12 bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle branded background element */}
        <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[20rem] font-bold text-gray-400 select-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              RK
            </div>
          </div>
        </div>

        {/* Pull-to-refresh indicator */}
        {isPulling && (
          <div className="fixed top-0 left-0 right-0 flex justify-center pt-4 z-40">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Release to refresh
            </div>
          </div>
        )}
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <header className="mb-4">
            <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 
                      className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 cursor-pointer select-none"
                      onClick={handleTitleClick}
                    >
                      Radiant Kids Check-In
                    </h1>
                    {showResetButton && (
                      <button
                        onClick={handleSystemReset}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-lg animate-scale-in flex items-center gap-1.5 transition-colors"
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
                    <div className="flex items-center gap-3 flex-wrap">
                      {userProfile.role === 'teacher' && userProfile.assignedClassroom && (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm font-semibold shadow-md">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                          </svg>
                          {userProfile.assignedClassroom}
                        </span>
                      )}
                      <button
                        onClick={handleChangeProfile}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  {!userProfile && (
                    <p className="text-gray-600 text-sm sm:text-base md:text-lg">
                      Live classroom attendance
                    </p>
                  )}
                </div>

                {/* Status Information */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Mode indicator */}
                  {mode && (
                    <span
                      className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                        mode === 'mock'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {mode === 'mock' ? 'Mock Mode' : 'Live Mode'}
                    </span>
                  )}
                  
                  {/* Refresh mode indicator */}
                  <span
                    className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                      refreshMode === 'service'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                    title={refreshMode === 'service' ? 'Refreshing every 30 seconds' : 'Refreshing every 5 minutes'}
                  >
                    {refreshMode === 'service' ? '⚡ Service Time' : '🌙 Off-Hours'}
                  </span>

                  {/* Last updated time */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {loading && checkIns.length > 0 && (
                      <svg
                        className="w-4 h-4 animate-spin text-gray-400"
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
                    <span className="font-medium">{formatLastUpdated()}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Admin Tabs and Content */}
          {userProfile?.role === 'admin' ? (
            <>
              {/* Tab Navigation */}
              <div className="mb-4">
                <div className="bg-white rounded-lg shadow-lg border-b border-gray-200">
                  <nav className="flex gap-1 p-2">
                    <button
                      onClick={() => setActiveAdminTab('overview')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                        activeAdminTab === 'overview'
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveAdminTab('checkins')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                        activeAdminTab === 'checkins'
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Check-Ins
                      {checkIns.length > 0 && (
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          activeAdminTab === 'checkins'
                            ? 'bg-white/20'
                            : 'bg-primary-100 text-primary-700'
                        }`}>
                          {checkIns.filter(c => !c.checkedOut).length}
                        </span>
                      )}
                    </button>
                  </nav>
                </div>
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
                  <div id="filters-section" className="mb-4">
            <div className="bg-white rounded-lg shadow-lg p-3 md:p-4">
              {/* Location & Classroom Dropdowns (Admin Only - Side by Side) */}
              {userProfile?.role === 'admin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Location Dropdown */}
                  <div>
                    <label htmlFor="location-select" className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      Location
                    </label>
                    <select
                      id="location-select"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-base font-medium bg-white hover:border-gray-400 cursor-pointer"
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

                  {/* Classroom Dropdown */}
                  <div>
                    <label htmlFor="classroom-select" className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      Classroom
                    </label>
                    <select
                      id="classroom-select"
                      value={selectedClassroom}
                      onChange={(e) => setSelectedClassroom(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-base font-medium bg-white hover:border-gray-400 cursor-pointer"
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Service Time Filters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Service Time
                    </h3>
                  </div>
                  <div 
                    ref={overviewServiceTimeScrollRef}
                    className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" 
                    style={{scrollbarWidth: 'thin'}}
                  >
                    {serviceTimes.map((time) => (
                      <button
                        key={time}
                        data-service-time={time}
                        onClick={() => setSelectedServiceTime(time)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0 whitespace-nowrap ${
                          selectedServiceTime === time
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                        }`}
                      >
                        {time}
                        {checkIns.length > 0 && (
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                            selectedServiceTime === time 
                              ? 'bg-white bg-opacity-20' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {time === 'All' 
                              ? checkIns.filter(c => !c.checkedOut && c.status !== 'no-show' && 
                                  (selectedLocation === 'All' || c.locationName === selectedLocation) &&
                                  (selectedClassroom === 'All' || c.className === selectedClassroom)
                                ).length
                              : checkIns.filter(c => 
                                  !c.checkedOut &&
                                  c.status !== 'no-show' &&
                                  c.serviceName.toUpperCase().includes(time) && 
                                  (selectedLocation === 'All' || c.locationName === selectedLocation) &&
                                  (selectedClassroom === 'All' || c.className === selectedClassroom)
                                ).length
                            }
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Statistics Bar (Both Admin and Teacher) */}
                <div className="flex flex-wrap justify-end gap-3">
                    {/* Checked In */}
                    <div className="bg-white rounded-lg shadow-md p-3 min-w-[140px] sm:min-w-[160px] flex-1 sm:flex-none">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-600 rounded-lg p-2 flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Checked In</div>
                          <div className="text-xl font-bold text-gray-900">{stats.checkedIn}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Checked Out */}
                    <div className="bg-white rounded-lg shadow-md p-3 min-w-[140px] sm:min-w-[160px] flex-1 sm:flex-none">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-500 rounded-lg p-2 flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Checked Out</div>
                          <div className="text-xl font-bold text-gray-900">{stats.checkedOut}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Total Kids */}
                    <div className="bg-white rounded-lg shadow-md p-3 min-w-[140px] sm:min-w-[160px] flex-1 sm:flex-none">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 rounded-lg p-2 flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Total Kids</div>
                          <div className="text-xl font-bold text-gray-900">{stats.total}</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
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
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-12 text-center">
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
                      const matchesServiceTime = selectedServiceTime === 'All' ||
                        checkIn.serviceName.toUpperCase().includes(selectedServiceTime);
                      
                      return matchesLocation && matchesClassroom && matchesServiceTime;
                    })}
                    onUndo={handleCheckIn}
                    selectedServiceTime={selectedServiceTime}
                  />
                </>
              )}
            </>
          ) : userProfile?.role === 'teacher' ? (
            // Teacher View - No tabs, direct filters and content
            <>
              {/* Filters and Stats */}
              <div id="filters-section" className="mb-4">
                <div className="bg-white rounded-lg shadow-lg p-3 md:p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Service Time Filters */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Service Time
                        </h3>
                      </div>
                      <div 
                        ref={checkInsServiceTimeScrollRef}
                        className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" 
                        style={{scrollbarWidth: 'thin'}}
                      >
                        {serviceTimes.map((time) => (
                          <button
                            key={time}
                            data-service-time={time}
                            onClick={() => setSelectedServiceTime(time)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0 whitespace-nowrap ${
                              selectedServiceTime === time
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                            }`}
                          >
                            {time}
                            {checkIns.length > 0 && (
                              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                                selectedServiceTime === time 
                                  ? 'bg-white bg-opacity-20' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {time === 'All' 
                                  ? checkIns.filter(c => !c.checkedOut && c.status !== 'no-show' && 
                                      (selectedLocation === 'All' || c.locationName === selectedLocation) &&
                                      (selectedClassroom === 'All' || c.className === selectedClassroom)
                                    ).length
                                  : checkIns.filter(c => 
                                      !c.checkedOut &&
                                      c.status !== 'no-show' &&
                                      c.serviceName.toUpperCase().includes(time) && 
                                      (selectedLocation === 'All' || c.locationName === selectedLocation) &&
                                      (selectedClassroom === 'All' || c.className === selectedClassroom)
                                    ).length
                                }
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Statistics Bar (Teacher) */}
                    <div className="flex flex-wrap justify-end gap-3">
                      {/* Checked In */}
                      <div className="bg-white rounded-lg shadow-md p-3 min-w-[140px] sm:min-w-[160px] flex-1 sm:flex-none">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-600 rounded-lg p-2 flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Checked In</div>
                            <div className="text-xl font-bold text-gray-900">{stats.checkedIn}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Checked Out */}
                      <div className="bg-white rounded-lg shadow-md p-3 min-w-[140px] sm:min-w-[160px] flex-1 sm:flex-none">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-500 rounded-lg p-2 flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Checked Out</div>
                            <div className="text-xl font-bold text-gray-900">{stats.checkedOut}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Total Kids */}
                      <div className="bg-white rounded-lg shadow-md p-3 min-w-[140px] sm:min-w-[160px] flex-1 sm:flex-none">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 rounded-lg p-2 flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Total Kids</div>
                            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
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
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-12 text-center">
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
                const matchesServiceTime = selectedServiceTime === 'All' ||
                  checkIn.serviceName.toUpperCase().includes(selectedServiceTime);
                
                return matchesLocation && matchesClassroom && matchesServiceTime;
              })}
              onUndo={handleCheckIn}
              selectedServiceTime={selectedServiceTime}
            />
          )}
          
          {/* Toast Notification */}
          {toast && (
            <Toast
              message={toast.message}
              onUndo={toast.onUndo}
              onClose={() => setToast(null)}
              duration={5000}
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
      </main>
    </>
  );
}

