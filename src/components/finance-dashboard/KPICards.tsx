'use client';

import { TrendingUp, TrendingDown, Minus, DollarSign, Receipt, Gem, Building2, Handshake } from 'lucide-react';
import type { PeriodComparison, TrendDirection } from '@/modules/finance-dashboard/types';

interface KPICardsProps {
  comparison: PeriodComparison;
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
}

function TrendBadge({ percentage, direction }: { percentage: number; direction: TrendDirection }) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const color = direction === 'up' ? 'text-green-600' : direction === 'down' ? 'text-red-600' : 'text-gray-500';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon size={12} />
      {Math.abs(percentage).toFixed(1)}% vs last period
    </span>
  );
}

const kpiConfig = [
  { key: 'revenue' as const, label: 'Total Revenue', icon: DollarSign, iconBg: 'bg-green-50', iconColor: 'text-green-600', valueKey: 'totalRevenue' as const },
  { key: 'expenses' as const, label: 'Total Expenses', icon: Receipt, iconBg: 'bg-red-50', iconColor: 'text-red-600', valueKey: 'totalExpenses' as const },
  { key: 'netProfit' as const, label: 'Net Profit', icon: Gem, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueKey: 'netProfit' as const },
  { key: 'cspaceProfit' as const, label: 'C-Space Profit', icon: Building2, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', valueKey: 'cspaceProfit' as const },
  { key: 'investorPayouts' as const, label: 'Investor Payouts', icon: Handshake, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', valueKey: 'investorPayouts' as const },
];

export default function KPICards({ comparison }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4 mb-6">
      {kpiConfig.map(({ key, label, icon: Icon, iconBg, iconColor, valueKey }) => (
        <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">{label}</span>
            <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
              <Icon size={16} className={iconColor} />
            </div>
          </div>
          <div className="text-lg lg:text-xl font-bold text-gray-900 mb-1">
            {formatAmount(comparison.current[valueKey])}
          </div>
          <TrendBadge
            percentage={comparison.deltas[key].percentage}
            direction={comparison.deltas[key].trend}
          />
        </div>
      ))}
    </div>
  );
}
