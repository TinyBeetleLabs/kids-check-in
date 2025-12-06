/**
 * ServiceGroup Component
 * 
 * Displays a group of check-ins for a specific service time.
 * Groups children by family (same security code) for easy parent pickup.
 * Families are expandable/collapsible, expanded by default.
 */

import React, { useState, useMemo } from 'react';
import { CheckInData } from '@/lib/mockData';
import SearchBar from './SearchBar';
import PaginationControls from './PaginationControls';
import CheckOutActions from './CheckOutActions';

interface ServiceGroupProps {
  serviceName: string;
  checkIns: CheckInData[];
  onCheckOut: (securityCode: string) => void;
  onCheckIn: (securityCode: string) => void;
  onDismiss: (securityCode: string, serviceName?: string) => void;
  onRollOver: (securityCode: string, serviceName?: string) => void;
  showCheckOutButtons?: boolean; // Control visibility of check-out buttons
}

const DEFAULT_PAGE_SIZE = 5; // TESTING: Show 5 kids initially (TODO: Change back to 20 for production)

interface FamilyGroup {
  familyName: string;
  securityCode: string;
  children: CheckInData[];
  checkInTime: string; // Earliest check-in time for the family
  isCheckedOut: boolean; // All children are checked out
}

export default function ServiceGroup({ serviceName, checkIns, onCheckOut, onCheckIn, onDismiss, onRollOver, showCheckOutButtons = false }: ServiceGroupProps) {
  // Track expanded state for each family (default to all expanded)
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  
  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [itemsToShow, setItemsToShow] = useState<number>(DEFAULT_PAGE_SIZE);
  const [showAll, setShowAll] = useState<boolean>(false);
  
  // Filter out checked-out kids - they should only appear in CheckedOutList
  const activeCheckIns = checkIns.filter(checkIn => !checkIn.checkedOut);
  
  /**
   * Groups check-ins by family (security code)
   * Siblings with the same security code in the same service time are grouped together
   * Different service times for the same child create separate family groups
   */
  const groupByFamily = (): FamilyGroup[] => {
    const familyMap = new Map<string, FamilyGroup>();
    
    activeCheckIns.forEach((checkIn) => {
      // Group by security code + service name
      // This ensures:
      // 1. Siblings with same security code in same service = grouped together
      // 2. Same child in different services = separate groups
      const key = `${checkIn.securityCode}-${checkIn.serviceName}`;
      
      if (!familyMap.has(key)) {
        // New family group for this security code + service combination
        familyMap.set(key, {
          familyName: checkIn.familyName,
          securityCode: checkIn.securityCode,
          children: [checkIn],
          checkInTime: checkIn.checkInTime,
          isCheckedOut: false,
        });
      } else {
        // Add to existing family group (sibling in same service)
        const family = familyMap.get(key)!;
        family.children.push(checkIn);
        
        // Update to earliest check-in time
        if (new Date(checkIn.checkInTime) < new Date(family.checkInTime)) {
          family.checkInTime = checkIn.checkInTime;
        }
      }
    });
    
    // Determine if all children in family are checked out
    familyMap.forEach((family) => {
      family.isCheckedOut = family.children.every(child => child.checkedOut);
    });
    
    return Array.from(familyMap.values()).sort((a, b) => {
      return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
    });
  };

  const families = groupByFamily();

  /**
   * Filter families based on search query
   * Searches child names, family names, and security codes
   */
  const filteredFamilies = useMemo(() => {
    if (!searchQuery.trim()) {
      return families;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    return families.filter(family => {
      // Check if security code matches (most specific search)
      if (family.securityCode.toLowerCase().includes(query)) {
        return true;
      }
      
      // Check if family name matches
      if (family.familyName.toLowerCase().includes(query)) {
        return true;
      }
      
      // Check if any child name matches
      return family.children.some(child => {
        return child.childName.toLowerCase().includes(query);
      });
    });
  }, [families, searchQuery]);

  /**
   * Apply pagination to filtered families
   * Never split families across pages - show complete families only
   */
  const paginatedFamilies = useMemo(() => {
    if (showAll || filteredFamilies.length <= DEFAULT_PAGE_SIZE) {
      return filteredFamilies;
    }
    
    // Count kids as we add complete families
    let kidsCount = 0;
    const result: FamilyGroup[] = [];
    
    for (const family of filteredFamilies) {
      // Add complete family if it fits, or if it's the first family (always show at least one)
      if (kidsCount + family.children.length <= itemsToShow || result.length === 0) {
        result.push(family);
        kidsCount += family.children.length;
      } else {
        break; // Stop when we exceed the limit
      }
    }
    
    return result;
  }, [filteredFamilies, itemsToShow, showAll]);

  // Calculate total kids for stats
  const totalKidsInFiltered = filteredFamilies.reduce((sum, f) => sum + f.children.length, 0);
  const showingKidsCount = paginatedFamilies.reduce((sum, f) => sum + f.children.length, 0);

  /**
   * Initialize all families as expanded on first render
   */
  React.useEffect(() => {
    const allCodes = new Set(paginatedFamilies.map(f => f.securityCode));
    setExpandedFamilies(allCodes);
  }, [paginatedFamilies.length]); // Only run when number of families changes

  /**
   * Reset pagination when search query changes
   */
  React.useEffect(() => {
    setItemsToShow(DEFAULT_PAGE_SIZE);
    setShowAll(false);
  }, [searchQuery]);

  /**
   * Toggle family expanded/collapsed state
   */
  const toggleFamily = (securityCode: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(securityCode)) {
        newSet.delete(securityCode);
      } else {
        newSet.add(securityCode);
      }
      return newSet;
    });
  };

  /**
   * Check if family is expanded
   */
  const isFamilyExpanded = (securityCode: string) => {
    return expandedFamilies.has(securityCode);
  };

  /**
   * Formats ISO date string to readable time
   * Example: "2024-01-15T09:30:00Z" -> "9:30 AM"
   */
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  /**
   * Calculate how long ago the check-in occurred
   * Example: "15 minutes ago"
   */
  const getTimeAgo = (isoString: string): string => {
    const now = new Date();
    const checkInTime = new Date(isoString);
    const diffMs = now.getTime() - checkInTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  /**
   * Pagination handlers
   */
  const handleShowMore = () => {
    setItemsToShow(prev => prev + DEFAULT_PAGE_SIZE);
  };

  const handleShowAll = () => {
    setShowAll(true);
    setItemsToShow(totalKidsInFiltered);
  };

  const handleShowLess = () => {
    setShowAll(false);
    setItemsToShow(DEFAULT_PAGE_SIZE);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mb-6 fade-in">
      {/* Service Header with Search */}
      <div className="bg-white border-b-2 border-emerald-500 rounded-t-lg px-4 md:px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Service Name + Badge */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              {serviceName}
            </h2>
            <span className="bg-emerald-100 text-emerald-700 px-3 md:px-4 py-1 rounded-full text-sm font-normal border border-emerald-300">
              {searchQuery 
                ? `${showingKidsCount} of ${totalKidsInFiltered} ${totalKidsInFiltered === 1 ? 'child' : 'children'}`
                : `${activeCheckIns.length} ${activeCheckIns.length === 1 ? 'child' : 'children'}`
              }
            </span>
          </div>

          {/* Right: Search Bar (only show if 10+ kids) */}
          {activeCheckIns.length > 10 && (
            <div className="flex-1 max-w-md min-w-[250px]">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name or code..."
                resultCount={searchQuery ? totalKidsInFiltered : undefined}
                totalCount={searchQuery ? activeCheckIns.length : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop/Tablet Table View - Hidden on mobile */}
      <div className="hidden md:block overflow-hidden shadow-md rounded-b-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <caption className="sr-only">
              Check-ins for {serviceName}: {activeCheckIns.length} {activeCheckIns.length === 1 ? 'child' : 'children'}
            </caption>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Child Name
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Security Code
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-In Time
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medical Notes
                </th>
                <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedFamilies.map((family, familyIndex) => {
                const isExpanded = isFamilyExpanded(family.securityCode);
                const isSingleChild = family.children.length === 1;
                
                // For single children, render directly without family header
                if (isSingleChild) {
                  const child = family.children[0];
                  return (
                    <tr
                      key={child.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900">
                            {child.childName}
                          </div>
                          {/* Badges */}
                          {child.isFirstTime && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                              NEW
                            </span>
                          )}
                          {child.hasBirthday && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                              🎂 Birthday
                            </span>
                          )}
                          {child.rolledOverFrom && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                              🔄 From {child.rolledOverFrom.match(/(\d{1,2}:\d{2}\s?[AP]M)/)?.[0]}
                            </span>
                          )}
                          {child.isMultiService && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                              📅 Multi-Service
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-base font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm">
                          {family.securityCode}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {formatTime(child.checkInTime)}
                        </div>
                        {/* <div className="text-xs text-gray-500">
                          {getTimeAgo(child.checkInTime)}
                        </div> */}
                      </td>
                      <td className="px-6 py-2.5">
                        {child.medicalNotes ? (
                          <div className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1">
                            <svg
                              className="w-4 h-4 text-yellow-600 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-sm text-gray-800 font-medium">
                              {child.medicalNotes}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-2.5 text-center">
                        <CheckOutActions
                          familyName={family.familyName}
                          securityCode={family.securityCode}
                          onCheckOut={() => onCheckOut(family.securityCode)}
                          onDismiss={() => onDismiss(family.securityCode, serviceName)}
                          onRollOver={() => onRollOver(family.securityCode, serviceName)}
                        />
                      </td>
                    </tr>
                  );
                }
                
                // For families with multiple children, show collapsible group
                return (
                  <React.Fragment key={family.securityCode}>
                    {/* Family Header Row */}
                    <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-150">
                      <td className="px-6 py-2.5">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleFamily(family.securityCode)}
                            className="p-1 hover:bg-white/50 rounded-lg transition-all duration-200"
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${family.familyName} family`}
                            aria-expanded={isExpanded}
                          >
                            <svg
                              className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {family.familyName} Family
                            </div>
                            <div className="text-xs text-gray-600">
                              {family.children.length} children
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-2.5">
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-base font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm">
                          {family.securityCode}
                        </span>
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="text-sm text-gray-900 font-medium">
                          {formatTime(family.checkInTime)}
                        </div>
                        {/* <div className="text-xs text-gray-500">
                          {getTimeAgo(family.checkInTime)}
                        </div> */}
                      </td>
                      <td className="px-6 py-2.5">
                        {family.children.some(c => c.medicalNotes) ? (
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-gray-800 font-medium">
                              {family.children.filter(c => c.medicalNotes).length} {family.children.filter(c => c.medicalNotes).length === 1 ? 'note' : 'notes'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-2.5 text-center">
                        <CheckOutActions
                          familyName={family.familyName}
                          securityCode={family.securityCode}
                          onCheckOut={() => onCheckOut(family.securityCode)}
                          onDismiss={() => onDismiss(family.securityCode, serviceName)}
                          onRollOver={() => onRollOver(family.securityCode, serviceName)}
                        />
                      </td>
                    </tr>

                    {/* Children Rows - Only show if expanded */}
                    {isExpanded && family.children.map((child) => (
                      <tr
                        key={child.id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-2 pl-16">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-700">
                              {child.childName}
                            </div>
                            {/* Badges */}
                            {child.isFirstTime && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                                NEW
                              </span>
                            )}
                            {child.hasBirthday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                                🎂 Birthday
                              </span>
                            )}
                            {child.rolledOverFrom && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                                🔄 From {child.rolledOverFrom.match(/(\d{1,2}:\d{2}\s?[AP]M)/)?.[0]}
                              </span>
                            )}
                            {child.isMultiService && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                📅 Multi-Service
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-2">
                          {/* Empty - code shown in family header */}
                        </td>
                        <td className="px-6 py-2">
                          {child.checkInTime !== family.checkInTime && (
                            <div className="text-sm text-gray-500">
                              {formatTime(child.checkInTime)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-2">
                          {child.medicalNotes ? (
                            <div className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1">
                              <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm text-gray-800 font-medium">
                                {child.medicalNotes}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-6 py-2 text-center">
                          {/* Empty - family checked out together */}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls - Desktop/Tablet */}
        {!searchQuery && (
          <PaginationControls
            showing={showingKidsCount}
            total={totalKidsInFiltered}
            onShowMore={handleShowMore}
            onShowAll={handleShowAll}
            onShowLess={handleShowLess}
            isShowingAll={showAll}
            pageSize={DEFAULT_PAGE_SIZE}
          />
        )}
      </div>

      {/* Mobile Card View - Only visible on mobile */}
      <div className="md:hidden bg-white rounded-b-lg shadow-md overflow-hidden">
        <div className="divide-y divide-gray-200">
          {paginatedFamilies.map((family, index) => {
            const isExpanded = isFamilyExpanded(family.securityCode);
            const isSingleChild = family.children.length === 1;
            
            // For single children, render simplified card
            if (isSingleChild) {
              const child = family.children[0];
              return (
                <div key={child.id} className="p-4 hover:bg-blue-50 transition-colors">
                  {/* Child Name & Security Code */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                        Child Name
                      </div>
                      <div className="text-base font-bold text-gray-900 mb-2">
                        {child.childName}
                      </div>
                      {/* Badges */}
                      <div className="flex flex-wrap gap-1">
                        {child.isFirstTime && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                            NEW
                          </span>
                        )}
                        {child.hasBirthday && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                            🎂 Birthday
                          </span>
                        )}
                        {child.rolledOverFrom && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                            🔄 From {child.rolledOverFrom.match(/(\d{1,2}:\d{2}\s?[AP]M)/)?.[0]}
                          </span>
                        )}
                        {child.isMultiService && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                            📅 Multi-Service
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Security Code - Large badge */}
                    <div className="ml-3">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 text-right">
                        Code
                      </div>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-md text-lg font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm">
                        {family.securityCode}
                      </span>
                    </div>
                  </div>

                  {/* Check-In Time */}
                  <div className="mb-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Check-In Time
                    </div>
                    <div className="text-sm text-gray-900 font-medium">
                      {formatTime(child.checkInTime)}
                      <span className="text-xs text-gray-500 ml-2">
                        ({getTimeAgo(child.checkInTime)})
                      </span>
                    </div>
                  </div>

                  {/* Medical Notes */}
                  <div className="mb-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Medical Notes
                    </div>
                    {child.medicalNotes ? (
                      <div className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                        <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-800 font-medium">
                          {child.medicalNotes}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">None</span>
                    )}
                  </div>

                  {/* Check-Out Actions */}
                  <div>
                    <CheckOutActions
                      familyName={family.familyName}
                      securityCode={family.securityCode}
                      onCheckOut={() => onCheckOut(family.securityCode)}
                      onDismiss={() => onDismiss(family.securityCode, serviceName)}
                      onRollOver={() => onRollOver(family.securityCode, serviceName)}
                    />
                  </div>
                </div>
              );
            }
            
            // For families with multiple children
            return (
              <div
                key={family.securityCode}
                className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500"
              >
                {/* Family Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <button
                        onClick={() => toggleFamily(family.securityCode)}
                        className="p-1.5 hover:bg-white/50 rounded-lg transition-all"
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${family.familyName} family`}
                        aria-expanded={isExpanded}
                      >
                        <svg
                          className={`w-4 h-4 text-blue-600 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Family
                        </div>
                        <div className="text-base font-bold text-gray-900">
                          {family.familyName} Family
                          <span className="ml-1 text-sm font-normal text-gray-600">
                            ({family.children.length})
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Children List - Only show if expanded */}
                    {isExpanded && (
                      <div className="space-y-2 ml-2 mt-2 border-l-2 border-blue-300 pl-3">
                        {family.children.map((child) => (
                          <div key={child.id} className="flex flex-col gap-1">
                            <div className="text-sm font-medium text-gray-700">
                              • {child.childName}
                            </div>
                            {/* Badges */}
                            {(child.isFirstTime || child.hasBirthday) && (
                              <div className="flex flex-wrap gap-1 ml-3">
                                {child.isFirstTime && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                                    NEW
                                  </span>
                                )}
                                {child.hasBirthday && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                                    🎂 Birthday
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Security Code */}
                  <div className="ml-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 text-right">
                      Code
                    </div>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-md text-lg font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm">
                      {family.securityCode}
                    </span>
                  </div>
                </div>

                {/* Check-In Time */}
                <div className="mb-3">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Check-In Time
                  </div>
                  <div className="text-sm text-gray-900 font-medium">
                    {formatTime(family.checkInTime)}
                    <span className="text-xs text-gray-500 ml-2">
                      ({getTimeAgo(family.checkInTime)})
                    </span>
                  </div>
                </div>

                {/* Medical Notes */}
                <div className="mb-3">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Medical Notes
                  </div>
                  <div className="space-y-2">
                    {family.children.map((child) =>
                      child.medicalNotes ? (
                        <div key={child.id} className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                          <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-800 font-medium">
                            {child.childName}: {child.medicalNotes}
                          </span>
                        </div>
                      ) : null
                    )}
                    {family.children.every((child) => !child.medicalNotes) && (
                      <span className="text-sm text-gray-400">None</span>
                    )}
                  </div>

                  {/* Check-Out Actions */}
                  <div>
                    <CheckOutActions
                      familyName={family.familyName}
                      securityCode={family.securityCode}
                      onCheckOut={() => onCheckOut(family.securityCode)}
                      onDismiss={() => onDismiss(family.securityCode, serviceName)}
                      onRollOver={() => onRollOver(family.securityCode, serviceName)}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
        
        {/* Pagination Controls - Mobile */}
        {!searchQuery && (
          <PaginationControls
            showing={showingKidsCount}
            total={totalKidsInFiltered}
            onShowMore={handleShowMore}
            onShowAll={handleShowAll}
            onShowLess={handleShowLess}
            isShowingAll={showAll}
            pageSize={DEFAULT_PAGE_SIZE}
          />
        )}
      </div>

      {/* Search Results Empty State */}
      {searchQuery && filteredFamilies.length === 0 && (
        <div className="bg-white px-4 md:px-6 py-12 text-center rounded-b-lg shadow-md">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Results Found
          </h3>
          <p className="text-gray-600 mb-4">
            No kids found matching "<span className="font-semibold">{searchQuery}</span>"
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}

