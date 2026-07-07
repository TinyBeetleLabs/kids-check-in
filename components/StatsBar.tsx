import React from 'react';

interface StatItem {
  label: string;
  value: number;
  accent?: 'primary' | 'muted' | 'default' | 'success';
  icon: 'checked-in' | 'checked-out' | 'total';
}

interface StatsBarProps {
  stats: StatItem[];
}

const icons: Record<StatItem['icon'], React.ReactNode> = {
  'checked-in': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'checked-out': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  total: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
};

const cardStyles: Record<StatItem['icon'], { iconBg: string; iconColor: string; valueColor: string }> = {
  'checked-in': { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
  'checked-out': { iconBg: 'bg-slate-100', iconColor: 'text-slate-500', valueColor: 'text-ink-muted-48' },
  total: { iconBg: 'bg-indigo-100', iconColor: 'text-primary', valueColor: 'text-ink' },
};

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-sm">
      {stats.map((stat) => {
        const style = cardStyles[stat.icon];
        const valueColor =
          stat.accent === 'primary'
            ? 'text-primary'
            : stat.accent === 'muted'
              ? 'text-ink-muted-48'
              : stat.accent === 'success'
                ? 'text-emerald-600'
                : style.valueColor;

        return (
          <div key={stat.label} className="stat-card !p-sm">
            <div className={`stat-icon ${style.iconBg} ${style.iconColor} mb-xs`}>
              {icons[stat.icon]}
            </div>
            <div className={`font-display text-[22px] font-bold leading-none ${valueColor}`}>
              {stat.value}
            </div>
            <div className="font-text text-fine-print text-ink-muted-48 mt-xxs leading-tight">
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
