import React from 'react';

interface ServiceTimeChipProps {
  label: string;
  selected: boolean;
  count?: number;
  onClick: () => void;
  'data-service-time'?: string;
}

export default function ServiceTimeChip({
  label,
  selected,
  count,
  onClick,
  'data-service-time': dataServiceTime,
}: ServiceTimeChipProps) {
  return (
    <button
      type="button"
      data-service-time={dataServiceTime}
      onClick={onClick}
      aria-pressed={selected}
      className={
        selected
          ? 'chip-option-selected shrink-0 whitespace-nowrap shadow-sm'
          : 'chip-option shrink-0 whitespace-nowrap'
      }
    >
      {label}
      {count !== undefined && (
        <span
          className={`ml-xs px-xs py-xxs rounded-pill text-fine-print font-text ${
            selected ? 'bg-white/25 text-on-primary' : 'bg-surface-pearl text-ink-muted-80'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
