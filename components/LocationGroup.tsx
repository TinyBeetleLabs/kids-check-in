/**
 * LocationGroup Component
 * 
 * Groups check-ins by location when viewing "All" locations.
 * Uses a compact grid layout with individual kid cards for better scanning.
 * Locations are collapsible for better navigation.
 */

import React, { useState } from 'react';
import { CheckInData } from '@/lib/mockData';
import { sortClassrooms } from '@/lib/classrooms';
import CompactKidCard from './CompactKidCard';
import CompactFamilyCard from './CompactFamilyCard';

interface LocationGroupProps {
  locationName: string;
  checkIns: CheckInData[]; // Active check-ins (for display)
  allCheckIns?: CheckInData[]; // All check-ins including checked-out (for accurate counts)
  onCheckOut: (securityCode: string) => void;
  onCheckIn: (securityCode: string) => void;
  onDismiss: (securityCode: string, serviceName?: string) => void;
  onRollOver: (securityCode: string, serviceName?: string) => void;
}

export default function LocationGroup({
  locationName,
  checkIns, // Active check-ins for display
  allCheckIns, // All check-ins including checked-out for counts
  onCheckOut,
  onCheckIn,
  onDismiss,
  onRollOver,
}: LocationGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Use allCheckIns for counts if provided, otherwise use checkIns
  const checkInsForCounts = allCheckIns || checkIns;

  /**
   * Group check-ins by service time within this location
   */
  const groupByService = (data: CheckInData[]): Map<string, CheckInData[]> => {
    const grouped = new Map<string, CheckInData[]>();

    data.forEach((checkIn) => {
      const serviceName = checkIn.serviceName;
      if (!grouped.has(serviceName)) {
        grouped.set(serviceName, []);
      }
      grouped.get(serviceName)!.push(checkIn);
    });

    return grouped;
  };

  /**
   * Sort services chronologically
   */
  const parseTime = (serviceName: string): number => {
    const match = serviceName.match(/(\d{1,2}):(\d{2})\s?([AP]M)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  // Group and sort services
  const groupedCheckIns = groupByService(checkIns);
  const sortedServices = Array.from(groupedCheckIns.entries()).sort((a, b) => {
    return parseTime(a[0]) - parseTime(b[0]);
  });

  // Calculate stats using allCheckIns for accurate totals (already filtered by location in CheckInTable)
  const totalKids = checkInsForCounts.filter(c => c.status !== 'no-show').length;
  const checkedInKids = checkInsForCounts.filter(c => !c.checkedOut && c.status !== 'no-show').length;

  return (
    <div className="mb-8">
      {/* Location Header */}
      <div className="bg-surface-tile-1 rounded-t-lg">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-lg py-md flex items-center justify-between text-body-on-dark hover:bg-surface-tile-2 transition-all duration-200 rounded-t-lg min-h-[52px] active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            {/* Location Icon */}
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            
            {/* Location Name */}
            <div>
              <h2 className="font-text text-tagline text-left">{locationName}</h2>
              <p className="font-text text-caption text-body-muted text-left">
                {totalKids} {totalKids === 1 ? 'kid' : 'kids'} • {checkedInKids} still here
              </p>
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
              {sortedServices.length} {sortedServices.length === 1 ? 'service' : 'services'}
            </span>
            <svg
              className={`w-6 h-6 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Services Stacked with Horizontal Classroom Scroll */}
      {isExpanded && (
        <div className="bg-canvas-parchment rounded-b-lg border border-hairline border-t-0 p-lg space-y-xl">
          {sortedServices.map(([serviceName, serviceCheckIns]) => {
            // Extract just the time from service name
            const timeMatch = serviceName.match(/(\d{1,2}:\d{2}\s?[AP]M)/i);
            const displayTime = timeMatch ? timeMatch[1] : serviceName;
            
            // Get all check-ins for this service (including checked-out) for accurate counts
            const allServiceCheckIns = checkInsForCounts.filter(c => c.serviceName === serviceName);
            const totalServiceKids = allServiceCheckIns.filter(k => k.status !== 'no-show').length;
            const activeKids = allServiceCheckIns.filter(k => !k.checkedOut && k.status !== 'no-show').length;
            
            // Group kids by classroom within this service time (use active checkIns for display)
            const classroomGroups = new Map<string, CheckInData[]>();
            serviceCheckIns.forEach(kid => {
              const classroom = kid.className || 'Unassigned';
              if (!classroomGroups.has(classroom)) {
                classroomGroups.set(classroom, []);
              }
              classroomGroups.get(classroom)!.push(kid);
            });
            
            // Also get all check-ins per classroom (including checked-out) for accurate counts
            const allClassroomGroups = new Map<string, CheckInData[]>();
            allServiceCheckIns.forEach(kid => {
              const classroom = kid.className || 'Unassigned';
              if (!allClassroomGroups.has(classroom)) {
                allClassroomGroups.set(classroom, []);
              }
              allClassroomGroups.get(classroom)!.push(kid);
            });

            const sortedClassrooms = sortClassrooms(
              Array.from(classroomGroups.keys())
            ).map((classroom) => [classroom, classroomGroups.get(classroom)!] as const);
            
            return (
              <div key={serviceName} className="service-section-main">
                {/* Service Time Header */}
                <div className="service-header-main">
                  <div className="service-time-badge-main">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="time">{displayTime}</span>
                    <span className="count">{totalServiceKids} kids • {activeKids} still here</span>
                  </div>
                </div>

                {/* Horizontal Scroll Container for Classrooms */}
                <div className="classrooms-horizontal-container">
                  {/* Left Arrow */}
                  <button 
                    className="scroll-arrow scroll-arrow-left"
                    onClick={() => {
                      const container = document.getElementById(`classrooms-${locationName.replace(/\s+/g, '-')}-${displayTime.replace(/\s+/g, '')}`);
                      container?.scrollBy({ left: -350, behavior: 'smooth' });
                    }}
                    aria-label="Scroll left"
                  >
                    ‹
                  </button>

                  {/* Scrollable Classrooms */}
                  <div id={`classrooms-${locationName.replace(/\s+/g, '-')}-${displayTime.replace(/\s+/g, '')}`} className="classrooms-scroll">
                    {sortedClassrooms.map(([classroom, classroomKids]) => {
                      // Get all kids for this classroom (including checked-out) for accurate counts
                      const allClassroomKids = allClassroomGroups.get(classroom) || [];
                      const totalInClass = allClassroomKids.filter(k => k.status !== 'no-show').length;
                      const activeInClass = allClassroomKids.filter(k => !k.checkedOut && k.status !== 'no-show').length;
                      
                      return (
                        <div key={classroom} className="classroom-card">
                          {/* Classroom Header */}
                          <div className="classroom-header">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="classroom-name">{classroom}</span>
                            <span className="classroom-count">
                              {totalInClass} • {activeInClass} here
                            </span>
                          </div>

                          {/* Kids Grid - Grouped by Family */}
                          <div className="kids-grid">
                            {(() => {
                              // Group kids by security code (siblings)
                              const familyGroups = new Map<string, CheckInData[]>();
                              classroomKids.forEach(kid => {
                                const code = kid.securityCode;
                                if (!familyGroups.has(code)) {
                                  familyGroups.set(code, []);
                                }
                                familyGroups.get(code)!.push(kid);
                              });

                              // Convert to array and sort by first child's name
                              const sortedFamilies = Array.from(familyGroups.entries()).sort((a, b) => {
                                return a[1][0].childName.localeCompare(b[1][0].childName);
                              });

                              return sortedFamilies.map(([securityCode, siblings]) => {
                                const isFamily = siblings.length > 1;
                                
                                return (
                                  <div key={securityCode} className={`family-group ${isFamily ? 'has-siblings' : ''}`}>
                                    {isFamily ? (
                                      <CompactFamilyCard
                                        siblings={siblings}
                                        onCheckOut={onCheckOut}
                                        onCheckIn={onCheckIn}
                                        onDismiss={onDismiss}
                                        onRollOver={onRollOver}
                                      />
                                    ) : (
                                      <CompactKidCard
                                        kid={siblings[0]}
                                        onCheckOut={onCheckOut}
                                        onCheckIn={onCheckIn}
                                        onDismiss={onDismiss}
                                        onRollOver={onRollOver}
                                      />
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Arrow */}
                  <button 
                    className="scroll-arrow scroll-arrow-right"
                    onClick={() => {
                      const container = document.getElementById(`classrooms-${locationName.replace(/\s+/g, '-')}-${displayTime.replace(/\s+/g, '')}`);
                      container?.scrollBy({ left: 350, behavior: 'smooth' });
                    }}
                    aria-label="Scroll right"
                  >
                    ›
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .service-section-main {
          background: white;
          border-radius: 10px;
          padding: 16px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .service-header-main {
          margin-bottom: 16px;
        }

        .service-time-badge-main {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border: 2px solid #e5e7eb;
          padding: 14px 20px;
          border-radius: 8px;
        }

        .service-time-badge-main svg {
          color: #3b82f6;
        }

        .service-time-badge-main .time {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }

        .service-time-badge-main .count {
          font-size: 14px;
          color: #6b7280;
          margin-left: auto;
        }

        .classrooms-horizontal-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .classrooms-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding: 12px 0 16px 0;
          flex: 1;
          /* Hide scrollbar but keep functionality */
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .classrooms-scroll::-webkit-scrollbar {
          display: none;
        }

        .classroom-card {
          flex: 0 0 280px;
          min-width: 280px;
          max-width: 280px;
          scroll-snap-align: start;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .classroom-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: white;
          border-bottom: 2px solid #e5e7eb;
          font-size: 13px;
        }

        .classroom-header svg {
          color: #10b981;
        }

        .classroom-name {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #1f2937;
        }

        .classroom-count {
          margin-left: auto;
          font-size: 12px;
          color: #6b7280;
        }

        .kids-grid {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 6px;
          overflow: hidden;
        }

        .family-group {
          display: flex;
          flex-direction: column;
        }

        .family-group.has-siblings {
          border-left: 3px solid #3b82f6;
          margin: 2px 0;
        }

        .scroll-arrow {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          color: #3b82f6;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          font-weight: 300;
          line-height: 1;
        }

        .scroll-arrow:hover {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transform: scale(1.05);
        }

        .scroll-arrow:active {
          transform: scale(0.98);
        }

        @media (max-width: 768px) {
          .scroll-arrow {
            display: none; /* Hide arrows on mobile, use native swipe */
          }
          
          .classroom-card {
            flex: 0 0 75vw;
            min-width: 75vw;
            max-width: 75vw;
          }
        }

        @media (min-width: 1024px) {
          .classroom-card {
            flex: 0 0 320px;
            min-width: 320px;
            max-width: 320px;
          }
        }
      `}</style>
    </div>
  );
}


