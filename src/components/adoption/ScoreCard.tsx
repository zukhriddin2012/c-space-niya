'use client';

import { type LucideIcon } from 'lucide-react';

interface ScoreCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export function ScoreCard({ label, value, subtitle, trend, icon: Icon, iconBg, iconColor }: ScoreCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between">
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-3xl font-semibold text-gray-900 mt-1">{value}</div>
        {subtitle && <div className="text-sm text-gray-500 mt-0.5">{subtitle}</div>}
        {trend && (
          <div className={`text-xs mt-1 flex items-center gap-1 ${
            trend.direction === 'up' ? 'text-green-600' :
            trend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend.direction === 'up' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" />
              </svg>
            )}
            {trend.direction === 'down' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" />
              </svg>
            )}
            {trend.direction === 'neutral' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
              </svg>
            )}
            {trend.value}
          </div>
        )}
      </div>
      <div className={`p-2.5 rounded-lg ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
    </div>
  );
}
