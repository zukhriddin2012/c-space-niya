'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeftRight, Building2, Calendar, ChevronDown } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/modules/reception/lib/constants';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';

type PeriodType = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all_time' | 'custom';

interface DateRange {
  from: string;
  to: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  icon: string;
  count: number;
  amount: number;
}

interface DashboardStats {
  dateRange?: DateRange;
  income: {
    paid: number;
    debt: number;
    count: number;
    byServiceType: Array<{ serviceTypeId: string; serviceTypeName: string; icon: string; amount: number; count: number }>;
  };
  expenses: {
    opex: number;
    capex: number;
    total: number;
    count: number;
    topCategories: ExpenseCategory[];
  };
  profit: {
    operating: number;
    net: number;
  };
  recentActivity: Array<{
    type: 'transaction' | 'expense';
    id: string;
    number: string;
    title: string;
    subtitle: string;
    icon: string;
    amount: number;
    date: string;
    branchName?: string;
  }>;
  showBranchColumn?: boolean;
}

const periodLabels: Record<PeriodType, string> = {
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  this_year: 'This Year',
  all_time: 'All Time',
  custom: 'Custom Range',
};

function getDateRange(period: PeriodType, customFrom?: string, customTo?: string): DateRange {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  switch (period) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'this_week': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      return { from: startOfWeek.toISOString().split('T')[0], to: todayStr };
    }
    case 'this_month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: startOfMonth.toISOString().split('T')[0], to: todayStr };
    }
    case 'last_month': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: startOfLastMonth.toISOString().split('T')[0], to: endOfLastMonth.toISOString().split('T')[0] };
    }
    case 'this_quarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
      return { from: startOfQuarter.toISOString().split('T')[0], to: todayStr };
    }
    case 'this_year': {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return { from: startOfYear.toISOString().split('T')[0], to: todayStr };
    }
    case 'all_time':
      return { from: '2020-01-01', to: todayStr };
    case 'custom':
      return { from: customFrom || todayStr, to: customTo || todayStr };
    default:
      return { from: todayStr, to: todayStr };
  }
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + 'K';
  }
  return num.toLocaleString();
}

export default function ReceptionDashboard() {
  const { selectedBranchId } = useReceptionMode();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('this_month');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const dateRange = useMemo(() =>
    getDateRange(selectedPeriod, customFrom, customTo),
    [selectedPeriod, customFrom, customTo]
  );

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedBranchId) {
        params.append('branchId', selectedBranchId);
      }
      params.append('dateFrom', dateRange.from);
      params.append('dateTo', dateRange.to);

      const response = await fetch(`/api/reception/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handleClickOutside = () => setShowPeriodDropdown(false);
    if (showPeriodDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showPeriodDropdown]);

  const handlePeriodSelect = (period: PeriodType) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      setShowPeriodDropdown(false);
    }
  };

  const formatDateRangeDisplay = () => {
    if (selectedPeriod === 'all_time') return 'All Time';
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    if (dateRange.from === dateRange.to) {
      return fromDate.toLocaleDateString('en-US', options);
    }
    return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${toDate.toLocaleDateString('en-US', options)}`;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Income Statement</h1>
          <p className="text-gray-500">{formatDateRangeDisplay()}</p>
        </div>

        {/* Period Selector */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPeriodDropdown(!showPeriodDropdown);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-gray-700">{periodLabels[selectedPeriod]}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showPeriodDropdown && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
            >
              <div className="p-2 border-b border-gray-100">
                <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">Quick Select</p>
                <div className="grid grid-cols-2 gap-1">
                  {(['today', 'this_week', 'this_month', 'last_month', 'this_quarter', 'this_year', 'all_time'] as PeriodType[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => handlePeriodSelect(period)}
                      className={`px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                        selectedPeriod === period
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {periodLabels[period]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3">
                <p className="px-1 py-1 text-xs font-semibold text-gray-400 uppercase mb-2">Custom Range</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={customFrom || dateRange.from}
                    onChange={(e) => {
                      setCustomFrom(e.target.value);
                      setSelectedPeriod('custom');
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={customTo || dateRange.to}
                    onChange={(e) => {
                      setCustomTo(e.target.value);
                      setSelectedPeriod('custom');
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {selectedPeriod === 'custom' && (
                  <button
                    onClick={() => setShowPeriodDropdown(false)}
                    className="mt-3 w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Income Row: Paid | Debt */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-blue-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-blue-600 font-medium">Paid</p>
                <p className="text-3xl font-bold text-blue-700">{formatCompactNumber(stats?.income.paid || 0)}</p>
              </div>
            </Card>
            <Card className="border-2 border-blue-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-red-600 font-medium">Debt</p>
                <p className="text-3xl font-bold text-red-600">{formatCompactNumber(stats?.income.debt || 0)}</p>
              </div>
            </Card>
          </div>

          {/* Expenses Row: OpEx | CapEx */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-blue-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-blue-600 font-medium">OpEx</p>
                <p className="text-3xl font-bold text-blue-700">{formatCompactNumber(stats?.expenses.opex || 0)}</p>
              </div>
            </Card>
            <Card className="border-2 border-blue-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-blue-600 font-medium">CapEx</p>
                <p className="text-3xl font-bold text-blue-700">{formatCompactNumber(stats?.expenses.capex || 0)}</p>
              </div>
            </Card>
          </div>

          {/* Top 5 Expense Categories */}
          <Card className="border-2 border-green-200 bg-white">
            <div className="p-2">
              <h3 className="font-semibold text-gray-900 mb-4">Top 5 Expense Categories</h3>
              {(stats?.expenses.topCategories && stats.expenses.topCategories.length > 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {stats.expenses.topCategories.map((cat) => (
                    <div key={cat.id} className="text-center">
                      <p className="text-sm text-red-600 font-medium">{cat.name}</p>
                      <p className="text-xl font-bold text-red-700">{formatCompactNumber(cat.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No expenses in this period</p>
              )}
            </div>
          </Card>

          {/* Profit Row: Operating Profit | Profit */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-green-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-green-600 font-medium">Operating Profit</p>
                <p className={`text-3xl font-bold ${(stats?.profit.operating || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCompactNumber(stats?.profit.operating || 0)}
                </p>
              </div>
            </Card>
            <Card className="border-2 border-green-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-green-600 font-medium">Profit</p>
                <p className={`text-3xl font-bold ${(stats?.profit.net || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCompactNumber(stats?.profit.net || 0)}
                </p>
              </div>
            </Card>
          </div>

          {/* Income by Service Type */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-purple-600" />
              Income by Service Type
            </h3>
            <div className="space-y-3">
              {stats?.income.byServiceType.map((item) => (
                <div key={item.serviceTypeId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-gray-700">{item.serviceTypeName}</span>
                    <span className="text-xs text-gray-400">({item.count})</span>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              {(!stats?.income.byServiceType || stats.income.byServiceType.length === 0) && (
                <p className="text-gray-400 text-sm">No transactions in this period</p>
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {stats?.recentActivity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {item.subtitle} • {item.number}
                        {stats.showBranchColumn && item.branchName && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {item.branchName}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${item.type === 'transaction' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.type === 'transaction' ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
                    </p>
                    <p className="text-xs text-gray-400">{item.date}</p>
                  </div>
                </div>
              ))}
              {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                <p className="text-gray-400 text-sm text-center py-4">No recent activity</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
