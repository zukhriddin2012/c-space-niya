'use client';

export function getScoreColor(score: number): {
  color: string;
  bg: string;
  barColor: string;
  label: string;
} {
  if (score >= 80) return { color: 'text-green-600', bg: 'bg-green-50', barColor: 'bg-green-600', label: 'Excellent' };
  if (score >= 60) return { color: 'text-blue-600', bg: 'bg-blue-50', barColor: 'bg-blue-600', label: 'Good' };
  if (score >= 40) return { color: 'text-amber-600', bg: 'bg-amber-50', barColor: 'bg-amber-600', label: 'Needs Attention' };
  return { color: 'text-red-600', bg: 'bg-red-50', barColor: 'bg-red-600', label: 'Low' };
}

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

export function ScoreBadge({ score, size = 'sm' }: ScoreBadgeProps) {
  const { color, bg, label } = getScoreColor(score);
  const padding = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${padding} ${color} ${bg}`}>
      {label}
    </span>
  );
}
