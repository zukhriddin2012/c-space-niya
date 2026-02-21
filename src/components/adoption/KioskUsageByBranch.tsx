'use client';

import { useState, useEffect } from 'react';
import { TabletSmartphone } from 'lucide-react';

interface KioskModule {
  module: string;
  label: string;
  actionCount: number;
}

interface KioskBranch {
  branchId: string;
  branchName: string;
  totalActions: number;
  modules: KioskModule[];
  actionTypes: Record<string, number>;
  activeDays: number;
  avgActionsPerDay: number;
}

interface KioskUsageByBranchProps {
  period: '7d' | '30d' | '90d';
}

export function KioskUsageByBranch({ period }: KioskUsageByBranchProps) {
  const [branches, setBranches] = useState<KioskBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/adoption/kiosk-usage?period=${period}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(data => {
        if (!cancelled) setBranches(data.branches || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [period]);

  const maxActions = branches.length > 0 ? branches[0].totalActions : 0;
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <TabletSmartphone size={18} className="text-purple-600" />
          <span className="text-base font-semibold text-gray-900">Kiosk Activity by Branch</span>
        </div>
      </div>

      <div className="p-5">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p className="text-sm text-gray-400 text-center py-6">Failed to load kiosk data.</p>
        )}

        {/* Empty */}
        {!loading && !error && branches.length === 0 && (
          <div className="text-center py-8">
            <TabletSmartphone size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No kiosk activity in this period.</p>
          </div>
        )}

        {/* Data */}
        {!loading && !error && branches.length > 0 && (
          <div className="flex flex-col gap-4">
            {branches.map((branch, i) => {
              const barWidth = maxActions > 0 ? (branch.totalActions / maxActions) * 100 : 0;
              const rankStyle = i === 0 ? 'bg-amber-100 text-amber-700'
                : i === 1 ? 'bg-gray-100 text-gray-500'
                : i === 2 ? 'bg-orange-50 text-orange-600'
                : 'bg-gray-100 text-gray-400';

              return (
                <div key={branch.branchId} className="flex flex-col gap-1.5">
                  {/* Top row: rank, name, stats */}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${rankStyle}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">{branch.branchName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                      <span>{branch.activeDays}/{periodDays}d active</span>
                      <span>{branch.avgActionsPerDay}/day</span>
                    </div>
                    <div className="w-14 text-right text-sm font-semibold text-purple-600 flex-shrink-0">
                      {branch.totalActions}
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="ml-9 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${Math.min(barWidth, 100)}%` }}
                    />
                  </div>

                  {/* Module chips */}
                  {branch.modules.length > 0 && (
                    <div className="ml-9 flex flex-wrap gap-1.5">
                      {branch.modules.slice(0, 3).map(mod => (
                        <span
                          key={mod.module}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-purple-50 text-purple-600"
                        >
                          {mod.label}
                          <span className="text-purple-400">{mod.actionCount}</span>
                        </span>
                      ))}
                      {branch.modules.length > 3 && (
                        <span className="text-[11px] text-gray-400 px-1 py-0.5">
                          +{branch.modules.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      {!loading && !error && branches.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="font-medium text-gray-600">
              {branches.reduce((sum, b) => sum + b.totalActions, 0)} total actions
            </span>
            <span>&middot;</span>
            <span>{branches.length} branches active</span>
          </div>
        </div>
      )}
    </div>
  );
}
