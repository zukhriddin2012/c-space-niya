'use client';

import { ScoreBadge, getScoreColor } from './ScoreBadge';

interface AdoptionOverviewProps {
  score: number;
  breadth: number;
  depth: number;
  frequency: number;
  activeUsers: number;
  totalUsers: number;
}

export function AdoptionOverview({ score, breadth, depth, frequency, activeUsers, totalUsers }: AdoptionOverviewProps) {
  const { color } = getScoreColor(score);

  // SVG ring gauge calculations
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const ringStrokeColor = score >= 80 ? '#059669' : score >= 60 ? '#2563eb' : score >= 40 ? '#d97706' : '#dc2626';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span className="text-base font-semibold text-gray-900">Score Breakdown</span>
        </div>
        <ScoreBadge score={score} />
      </div>
      <div className="p-5">
        {/* Ring gauge + dimension chips */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="-rotate-90 w-20 h-20">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="6" />
              <circle
                cx="40" cy="40" r={radius}
                fill="none" stroke={ringStrokeColor} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${color}`}>
              {score}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">Platform Adoption</div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600" /> Breadth {breadth}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" /> Depth {depth}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-600" /> Frequency {frequency}
              </span>
            </div>
          </div>
        </div>

        {/* Dimension bars */}
        <div className="space-y-1">
          <DimensionBar label="Breadth" value={breadth} barColor="bg-purple-600" textColor="text-purple-600"
            description={`${activeUsers} of ${totalUsers} users active`} />
          <DimensionBar label="Depth" value={depth} barColor="bg-blue-600" textColor="text-blue-600"
            description="Avg module coverage per user" />
          <DimensionBar label="Frequency" value={frequency} barColor="bg-green-600" textColor="text-green-600"
            description="Avg daily actions vs target" />
        </div>
      </div>
    </div>
  );
}

function DimensionBar({ label, value, barColor, textColor, description }: {
  label: string;
  value: number;
  barColor: string;
  textColor: string;
  description: string;
}) {
  return (
    <>
      <div className="flex items-center gap-3 py-2">
        <div className="w-20 text-sm font-medium text-gray-500">{label}</div>
        <div className="flex-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(value, 100)}%` }} />
          </div>
        </div>
        <div className={`w-9 text-sm font-semibold text-right ${textColor}`}>{value}</div>
      </div>
      <div className="text-[11px] text-gray-400 ml-[92px] -mt-1 mb-1">{description}</div>
    </>
  );
}
