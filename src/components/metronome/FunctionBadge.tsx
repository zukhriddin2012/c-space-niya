'use client';

import type { MetronomeFunctionTag } from '@/lib/db/metronome';

const tagConfig: Record<MetronomeFunctionTag, { label: string; bg: string; text: string }> = {
  bd: { label: 'BD', bg: 'bg-blue-100', text: 'text-blue-700' },
  construction: { label: 'CON', bg: 'bg-orange-100', text: 'text-orange-700' },
  hr: { label: 'HR', bg: 'bg-purple-100', text: 'text-purple-700' },
  finance: { label: 'FIN', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  legal: { label: 'Legal', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  strategy: { label: 'Strategy', bg: 'bg-amber-100', text: 'text-amber-700' },
  service: { label: 'Service', bg: 'bg-teal-100', text: 'text-teal-700' },
};

interface FunctionBadgeProps {
  tag: MetronomeFunctionTag;
  size?: 'sm' | 'md';
}

export default function FunctionBadge({ tag, size = 'sm' }: FunctionBadgeProps) {
  const config = tagConfig[tag] || tagConfig.bd;
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded font-semibold ${config.bg} ${config.text} ${sizeClasses}`}>
      {config.label}
    </span>
  );
}
