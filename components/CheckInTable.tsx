/**
 * CheckInTable Component
 * 
 * Main component for displaying all check-ins.
 * - When viewing a single location: Groups by service time
 * - When viewing all locations: Groups by location first, then service time
 * Handles grouping logic and renders appropriate group components.
 */

import React from 'react';
import { CheckInData } from '@/lib/mockData';
import ServiceGroup from './ServiceGroup';
import LocationGroup from './LocationGroup';

interface CheckInTableProps {
  checkIns: CheckInData[]; // Active check-ins (for display)
  allCheckIns?: CheckInData[]; // All check-ins including checked-out (for accurate counts)
  selectedLocation?: string; // 'All' or specific location name
  userRole?: 'admin' | 'teacher'; // User role to determine view type
  onCheckOut: (securityCode: string) => void;
  onCheckIn: (securityCode: string) => void;
  onDismiss: (securityCode: string, serviceName?: string) => void;
  onRollOver: (securityCode: string, serviceName?: string) => void;
}

export default function CheckInTable({ 
  checkIns, 
  allCheckIns, // All check-ins including checked-out (for accurate counts)
  selectedLocation = 'All',
  userRole = 'admin',
  onCheckOut, 
  onCheckIn, 
  onDismiss, 
  onRollOver 
}: CheckInTableProps) {
  // Use allCheckIns for counts if provided, otherwise fall back to checkIns
  const checkInsForCounts = allCheckIns || checkIns;
  /**
   * Groups check-ins by service name
   * Returns a Map with service name as key and array of check-ins as value
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

  // Group check-ins by service
  const groupedCheckIns = groupByService(checkIns);

  // Sort services by time (earliest first)
  const sortedServices = Array.from(groupedCheckIns.entries()).sort((a, b) => {
    // Extract time from service name and sort chronologically
    const parseTime = (serviceName: string) => {
      const match = serviceName.match(/(\d{1,2}):(\d{2})\s?([AP]M)/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    };
    
    return parseTime(a[0]) - parseTime(b[0]);
  });

  /**
   * Detect if we should use LocationGroup (summarized card view)
   * Only use LocationGroup when:
   * 1. User explicitly selected "All" locations
   * 2. There are actually multiple locations in the data
   * 3. It's NOT a teacher view (teachers always see detailed ServiceGroup)
   */
  const uniqueLocations = new Set(checkIns.map(c => c.locationName).filter(Boolean));
  const isAllLocationsView = 
    selectedLocation === 'All' && 
    uniqueLocations.size > 1 && 
    userRole !== 'teacher';

  /**
   * Group check-ins by location
   */
  const groupByLocation = (data: CheckInData[]): Map<string, CheckInData[]> => {
    const grouped = new Map<string, CheckInData[]>();

    data.forEach((checkIn) => {
      const location = checkIn.locationName || 'Unknown';
      if (!grouped.has(location)) {
        grouped.set(location, []);
      }
      grouped.get(location)!.push(checkIn);
    });

    return grouped;
  };

  // Handle empty state
  if (checkIns.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <svg
          className="mx-auto h-24 w-24 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3 className="text-2xl font-semibold text-gray-700 mb-2">
          No Check-Ins Yet
        </h3>
        <p className="text-gray-500 text-lg">
          Check-ins will appear here as children arrive.
        </p>
      </div>
    );
  }

  /**
   * Render location-based view when viewing all locations
   * This provides better organization than service-time grouping
   */
  if (isAllLocationsView) {
    const groupedByLocation = groupByLocation(checkIns);
    // Also group allCheckIns by location for accurate counts
    const groupedAllByLocation = checkInsForCounts ? groupByLocation(checkInsForCounts) : groupedByLocation;
    const sortedLocations = Array.from(groupedByLocation.entries()).sort((a, b) => {
      // Sort locations alphabetically
      return a[0].localeCompare(b[0]);
    });

    return (
      <div className="space-y-6">
        {/* Render each location group */}
        {sortedLocations.map(([locationName, locationCheckIns]) => {
          const allLocationCheckIns = groupedAllByLocation.get(locationName) || [];
          return (
            <LocationGroup
              key={locationName}
              locationName={locationName}
              checkIns={locationCheckIns}
              allCheckIns={allLocationCheckIns}
              onCheckOut={onCheckOut}
              onCheckIn={onCheckIn}
              onDismiss={onDismiss}
              onRollOver={onRollOver}
            />
          );
        })}
      </div>
    );
  }

  /**
   * Render service-based view when viewing a single location
   * This is the original behavior
   */
  return (
    <div className="space-y-6">
      {/* Render each service group */}
      {sortedServices.map(([serviceName, serviceCheckIns]) => (
        <ServiceGroup
          key={serviceName}
          serviceName={serviceName}
          checkIns={serviceCheckIns}
          onCheckOut={onCheckOut}
          onCheckIn={onCheckIn}
          onDismiss={onDismiss}
          onRollOver={onRollOver}
        />
      ))}
    </div>
  );
}

