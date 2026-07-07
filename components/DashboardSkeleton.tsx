/**
 * DashboardSkeleton — placeholder layout shown before profile setup
 */

import React from 'react';

const pulse = 'animate-pulse bg-slate-200/80 rounded-md';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-md" aria-hidden="true">
      <div className="grid grid-cols-3 gap-sm">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`stat-card h-[88px] ${pulse}`} />
        ))}
      </div>

      <div className="card-utility !p-md">
        <div className={`h-3 w-24 mb-sm ${pulse}`} />
        <div className="flex gap-xs flex-wrap">
          {[72, 88, 96, 80].map((w) => (
            <div key={w} className={`h-9 rounded-pill ${pulse}`} style={{ width: w }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-sm">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`rounded-lg h-28 ${pulse}`} />
        ))}
      </div>

      <div className="card-utility overflow-hidden !p-0">
        <div className="px-md py-sm border-b border-hairline flex items-center justify-between gap-md">
          <div className={`h-4 w-32 ${pulse}`} />
          <div className={`h-8 w-48 rounded-pill ${pulse}`} />
        </div>
        <div className="divide-y divide-hairline">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="px-md py-md flex items-center gap-md">
              <div className={`h-10 w-10 rounded-full shrink-0 ${pulse}`} />
              <div className="flex-1 space-y-xs min-w-0">
                <div className={`h-4 w-36 max-w-full ${pulse}`} />
                <div className={`h-3 w-24 max-w-full ${pulse}`} />
              </div>
              <div className={`h-8 w-20 rounded-pill shrink-0 ${pulse}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
