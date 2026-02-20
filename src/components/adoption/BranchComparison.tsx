'use client';

import { getScoreColor } from './ScoreBadge';

interface BranchScore {
  branchId: string;
  branchName: string;
  score: number;
  userCount: number;
  actionCount: number;
}

interface BranchComparisonProps {
  branches: BranchScore[];
}

export function BranchComparison({ branches }: BranchComparisonProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
          </svg>
          <span className="text-base font-semibold text-gray-900">Branch Comparison</span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex flex-col gap-3.5">
          {branches.map((branch, i) => {
            const { color, barColor } = getScoreColor(branch.score);
            const rankStyle = i === 0 ? 'bg-amber-100 text-amber-700' :
              i === 1 ? 'bg-gray-100 text-gray-500' :
              i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400';

            return (
              <div key={branch.branchId} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${rankStyle}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{branch.branchName}</div>
                  <div className="text-xs text-gray-400">{branch.userCount} users &middot; {branch.actionCount} actions</div>
                </div>
                <div className="flex-1 max-w-[140px]">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(branch.score, 100)}%` }} />
                  </div>
                </div>
                <div className={`w-10 text-right text-sm font-semibold ${color}`}>{branch.score}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" /> 80+ Excellent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> 60-79 Good</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> 40-59 Attention</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block" /> &lt;40 Low</span>
        </div>
      </div>
    </div>
  );
}
