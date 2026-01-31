'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, Receipt, Building2, Calendar, ChevronDown } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/modules/reception/lib/constants';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';

type PeriodType = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom';

interface DateRange {
  from: string;
  to: string;
}

interface DashboardStats {
  dateRange?: DateRange;
  transactions: {
    total: number;
    count: number;
    byServiceType: Array<{ serviceTypeId: string; serviceTypeName: string; icon: string; amount: number; count: number }>;
    byPaymentMethod: Array<{ paymentMethodId: string; paymentMethodName: string; icon: string; amount: number; count: number }>;
  };
  expenses: {
    total: number;
    count: number;
    byCash: number;
    byBank: number;
    byExpenseType: Array<{ expenseTypeId: string; expenseTypeName: string; icon: string; amount: number; count: number }>;
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
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
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

  // Close dropdown when clicking outside
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
    if (dateRange.from === dateRange.to) {
      return new Date(dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const fromDate = new Date(dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const toDate = new Date(dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fromDate} - ${toDate}`;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  const income = stats?.transactions.total || 0;
  const expenses = stats?.expenses.total || 0;
  const netBalance = income - expenses;

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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
              {/* Quick Select Options */}
              <div className="p-2 border-b border-gray-100">
                <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">Quick Select</p>
                <div className="grid grid-cols-2 gap-1">
                  {(['today', 'this_week', 'this_month', 'last_month', 'this_year', 'all_time'] as PeriodType[]).map((period) => (
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

              {/* Custom Range */}
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
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={customTo || dateRange.to}
                    onChange={(e) => {
                      setCustomTo(e.target.value);
                      setSelectedPeriod('custom');
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                {selectedPeriod === 'custom' && (
                  <button
                    onClick={() => setShowPeriodDropdown(false)}
                    className="mt-3 w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700">Income</p>
                  <p className="text-xl font-bold text-green-900">{formatCurrency(income)}</p>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-red-700">Expenses</p>
                  <p className="text-xl font-bold text-red-900">{formatCurrency(expenses)}</p>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-purple-700">Net Balance</p>
                  <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-purple-900' : 'text-red-700'}`}>
                    {formatCurrency(netBalance)}
                  </p>
                </div>
              </div>
            </Card>

          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Income by Service Type */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                Income by Service Type
              </h3>
              <div className="space-y-3">
                {stats?.transactions.byServiceType.map((item) => (
                  <div key={item.serviceTypeId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-gray-700">{item.serviceTypeName}</span>
                      <span className="text-xs text-gray-400">({item.count})</span>
                    </div>
                    <span className="font-semibold text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {(!stats?.transactions.byServiceType || stats.transactions.byServiceType.length === 0) && (
                  <p className="text-gray-400 text-sm">No transactions in this period</p>
                )}
              </div>
            </Card>

            {/* Expenses by Type */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600" />
                Expenses by Type
              </h3>
              <div className="space-y-3">
                {stats?.expenses.byExpenseType.map((item) => (
                  <div key={item.expenseTypeId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-gray-700">{item.expenseTypeName}</span>
                      <span className="text-xs text-gray-400">({item.count})</span>
                    </div>
                    <span className="font-semibold text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {(!stats?.expenses.byExpenseType || stats.expenses.byExpenseType.length === 0) && (
                  <p className="text-gray-400 text-sm">No expenses in this period</p>
                )}
              </div>
            </Card>
          </div>

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
