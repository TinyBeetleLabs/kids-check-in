import React, { RefObject } from 'react';
import ServiceTimeChip from '@/components/ui/ServiceTimeChip';

interface ServiceTimeFilterRowProps {
  serviceTimes: string[];
  selectedServiceTime: string;
  onSelect: (time: string) => void;
  getCount: (time: string) => number;
  scrollRef?: RefObject<HTMLDivElement>;
}

export default function ServiceTimeFilterRow({
  serviceTimes,
  selectedServiceTime,
  onSelect,
  getCount,
  scrollRef,
}: ServiceTimeFilterRowProps) {
  return (
    <div>
      <h3 className="font-text text-caption-strong text-ink mb-sm flex items-center gap-xs">
        <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        Service time
      </h3>
      <div
        ref={scrollRef}
        className="flex gap-xs overflow-x-auto pb-xs -mx-xs px-xs"
        style={{ scrollbarWidth: 'thin' }}
      >
        {serviceTimes.map((time) => (
          <ServiceTimeChip
            key={time}
            label={time}
            data-service-time={time}
            selected={selectedServiceTime === time}
            count={getCount(time)}
            onClick={() => onSelect(time)}
          />
        ))}
      </div>
    </div>
  );
}
