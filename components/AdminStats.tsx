/**
 * AdminStats Component — overview with colorful classroom cards
 */

import React, { useMemo } from 'react';
import { CheckInData } from '@/lib/mockData';
import {
  CLASSROOM_DISPLAY_CAPACITY,
  getClassroomTheme,
  sortClassrooms,
} from '@/lib/classrooms';

interface AdminStatsProps {
  checkIns: CheckInData[];
  onClassroomClick: (classroom: string) => void;
  selectedLocation?: string;
  onLocationChange?: (location: string) => void;
  locationOptions?: string[];
}

interface ServiceStats {
  total: number;
  checkedIn: number;
  checkedOut: number;
}

export default function AdminStats({
  checkIns,
  onClassroomClick,
  selectedLocation = 'All',
  onLocationChange,
  locationOptions = [],
}: AdminStatsProps) {
  const filteredCheckIns = useMemo(() => {
    if (selectedLocation === 'All' || !selectedLocation) {
      return checkIns;
    }
    return checkIns.filter((kid) => kid.locationName === selectedLocation);
  }, [checkIns, selectedLocation]);

  const extractServiceTime = (serviceName: string): string => {
    const timeMatch = serviceName.match(/(\d{1,2}:\d{2}\s?[AP]M)/i);
    if (timeMatch) return timeMatch[1];
    return serviceName;
  };

  const serviceStats = useMemo(() => {
    const stats: Record<string, ServiceStats> = {};
    filteredCheckIns.forEach((kid) => {
      if (kid.status === 'no-show') return;
      const serviceTime = kid.serviceTime || extractServiceTime(kid.serviceName);
      if (!stats[serviceTime]) {
        stats[serviceTime] = { total: 0, checkedIn: 0, checkedOut: 0 };
      }
      stats[serviceTime].total++;
      if (kid.checkedOut) stats[serviceTime].checkedOut++;
      else stats[serviceTime].checkedIn++;
    });
    return stats;
  }, [filteredCheckIns]);

  const classroomStats = useMemo(() => {
    const stats: Record<string, ServiceStats> = {};
    filteredCheckIns.forEach((kid) => {
      if (kid.status === 'no-show') return;
      if (!kid.className || kid.className === 'undefined') return;
      if (!stats[kid.className]) {
        stats[kid.className] = { total: 0, checkedIn: 0, checkedOut: 0 };
      }
      stats[kid.className].total++;
      if (kid.checkedOut) stats[kid.className].checkedOut++;
      else stats[kid.className].checkedIn++;
    });
    return stats;
  }, [filteredCheckIns]);

  const actualCheckIns = filteredCheckIns.filter((k) => k.status !== 'no-show');
  const totalKids = actualCheckIns.length;
  const totalCheckedOut = actualCheckIns.filter((k) => k.checkedOut).length;
  const totalActive = totalKids - totalCheckedOut;

  const sortedClassrooms = sortClassrooms(Object.keys(classroomStats));

  const selectClass =
    'w-full md:w-auto px-md py-xs rounded-pill border border-hairline font-text text-caption text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-primary-focus cursor-pointer min-h-[38px]';

  return (
    <div className="fade-in space-y-md">
      {onLocationChange && locationOptions.length > 0 && (
        <div className="card-utility !p-md">
          <label htmlFor="admin-location-select" className="flex items-center gap-xs font-text text-caption-strong text-ink mb-xs">
            <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Campus
          </label>
          <select
            id="admin-location-select"
            value={selectedLocation}
            onChange={(e) => onLocationChange(e.target.value)}
            className={selectClass}
          >
            {locationOptions.map((location) => {
              const count =
                location === 'All'
                  ? checkIns.filter((c) => !c.checkedOut && c.status !== 'no-show').length
                  : checkIns.filter(
                      (c) => !c.checkedOut && c.status !== 'no-show' && c.locationName === location
                    ).length;
              return (
                <option key={location} value={location}>
                  {location} ({count} {count === 1 ? 'child' : 'children'})
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Summary stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
        <div className="stat-card border-l-4 border-l-indigo-500">
          <div className="font-text text-fine-print text-ink-muted-48 uppercase tracking-wide">Total checked in</div>
          <div className="font-display text-[32px] font-bold text-ink leading-tight mt-xs">{totalKids}</div>
        </div>
        <div className="stat-card border-l-4 border-l-emerald-500">
          <div className="font-text text-fine-print text-ink-muted-48 uppercase tracking-wide">Still here</div>
          <div className="font-display text-[32px] font-bold text-emerald-600 leading-tight mt-xs">{totalActive}</div>
        </div>
        <div className="stat-card border-l-4 border-l-slate-300">
          <div className="font-text text-fine-print text-ink-muted-48 uppercase tracking-wide">Checked out</div>
          <div className="font-display text-[32px] font-bold text-ink-muted-48 leading-tight mt-xs">{totalCheckedOut}</div>
        </div>
      </div>

      {/* Classroom cards grid */}
      <div>
        <h3 className="font-text text-caption-strong text-ink mb-sm flex items-center gap-xs">
          <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          Classrooms
          <span className="font-text text-fine-print text-ink-muted-48 font-normal ml-xs">
            {selectedLocation === 'All' ? 'All campuses' : selectedLocation}
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-sm">
          {sortedClassrooms.map((classroom) => {
            const stats = classroomStats[classroom];
            const theme = getClassroomTheme(classroom);
            const pct = Math.min(100, (stats.checkedIn / CLASSROOM_DISPLAY_CAPACITY) * 100);
            const isFull = stats.checkedIn >= CLASSROOM_DISPLAY_CAPACITY;

            return (
              <button
                key={classroom}
                type="button"
                onClick={() => onClassroomClick(classroom)}
                className="text-left rounded-lg border border-hairline/60 shadow-card hover:shadow-card-hover transition-all active:scale-[0.98] overflow-hidden"
                style={{ backgroundColor: theme.bg }}
              >
                <div className="px-md pt-md pb-sm">
                  <div className="flex items-start justify-between gap-xs">
                    <span className="font-text text-caption-strong" style={{ color: theme.text }}>
                      {classroom}
                    </span>
                    {isFull && (
                      <span className="font-text text-fine-print font-bold uppercase px-xs py-xxs rounded-sm bg-white/80 text-red-600">
                        Full
                      </span>
                    )}
                  </div>
                  <div className="mt-sm">
                    <span className="font-display text-[28px] font-bold leading-none" style={{ color: theme.accent }}>
                      {stats.checkedIn}
                    </span>
                    <span className="font-text text-caption text-ink-muted-48"> / {CLASSROOM_DISPLAY_CAPACITY}</span>
                  </div>
                  <div className="font-text text-fine-print text-ink-muted-48 mt-xxs">checked in</div>
                </div>
                <div className="h-1.5 bg-white/60 mx-md mb-md rounded-pill overflow-hidden">
                  <div
                    className="h-full rounded-pill transition-all"
                    style={{ width: `${pct}%`, backgroundColor: theme.bar }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Service times */}
      <div className="card-utility">
        <h3 className="font-text text-caption-strong text-ink mb-sm flex items-center gap-xs">
          <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          By service time
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-xs">
          {Object.entries(serviceStats)
            .sort(([timeA], [timeB]) => {
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
              return parseTime(timeA) - parseTime(timeB);
            })
            .map(([serviceTime, stats]) => (
              <div key={serviceTime} className="p-sm bg-surface-pearl rounded-md border border-hairline/60">
                <div className="font-text text-caption-strong text-ink">{serviceTime}</div>
                <div className="font-display text-xl font-bold text-primary mt-xxs">{stats.checkedIn}</div>
                <div className="font-text text-fine-print text-ink-muted-48">
                  here · {stats.checkedOut} out
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
