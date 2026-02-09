'use client';

import type { MetronomePriority } from '@/lib/db/metronome';

const priorityConfig: Record<MetronomePriority, { color: string; label: string }> = {
  critical: { color: 'bg-red-500', label: 'Critical' },
  high: { color: 'bg-orange-500', label: 'High' },
  strategic: { color: 'bg-blue-500', label: 'Strategic' },
  resolved: { color: 'bg-green-500', label: 'Resolved' },
};

interface PriorityIndicatorProps {
  priority: MetronomePriority;
  showLabel?: boolean;
}

export default function PriorityIndicator({ priority, showLabel = false }: PriorityIndicatorProps) {
  const config = priorityConfig[priority] || priorityConfig.strategic;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      {showLabel && (
        <span className="text-xs text-gray-600">{config.label}</span>
      )}
    </span>
  );
}
