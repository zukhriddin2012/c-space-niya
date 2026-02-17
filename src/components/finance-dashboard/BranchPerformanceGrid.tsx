'use client';

import { TrendingUp, TrendingDown, Minus, Building2 } from 'lucide-react';
import type { BranchFinancials } from '@/modules/finance-dashboard/types';

interface BranchPerformanceGridProps {
  branches: BranchFinancials[];
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
}

export default function BranchPerformanceGrid({ branches }: BranchPerformanceGridProps) {
  if (branches.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
        No branch data available for this period
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">Branch Performance</h2>
          <p className="text-xs text-gray-500">Financial breakdown per branch for the selected period</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {branches.map((branch) => {
          const TrendIcon = branch.trend.direction === 'up' ? TrendingUp
            : branch.trend.direction === 'down' ? TrendingDown : Minus;
          const trendColor = branch.trend.direction === 'up' ? 'text-green-600'
            : branch.trend.direction === 'down' ? 'text-red-600' : 'text-gray-500';
          const isLoss = branch.netProfit < 0;

          return (
            <div key={branch.branchId} className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Building2 size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{branch.branchName}</div>
                    <div className="text-xs text-gray-500">Investor: {branch.investorName}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                  <TrendIcon size={12} />
                  {Math.abs(branch.trend.percentage).toFixed(1)}%
                </span>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="text-[11px] font-medium text-gray-500 uppercase">Revenue</div>
                  <div className="text-sm font-bold text-gray-900">{formatAmount(branch.revenue)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-gray-500 uppercase">Expenses</div>
                  <div className="text-sm font-bold text-gray-900">{formatAmount(branch.expenses)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-gray-500 uppercase">Net Profit</div>
                  <div className={`text-sm font-bold ${isLoss ? 'text-red-600' : 'text-gray-900'}`}>
                    {isLoss ? '-' : ''}{formatAmount(Math.abs(branch.netProfit))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-gray-500 uppercase">Transactions</div>
                  <div className="text-sm font-bold text-gray-900">{branch.transactionCount}</div>
                </div>
              </div>

              {/* Profit split bar */}
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase mb-1.5">Profit Split</div>
                <div className="flex h-2.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600" style={{ width: `${branch.cspacePercentage}%` }} />
                  <div className="bg-blue-500" style={{ width: `${branch.investorPercentage}%` }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[11px] text-purple-600 font-medium">
                    C-Space {branch.cspacePercentage}% ({formatAmount(branch.cspaceShare)})
                  </span>
                  <span className="text-[11px] text-blue-600 font-medium">
                    Investor {branch.investorPercentage}% ({formatAmount(branch.investorShare)})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
