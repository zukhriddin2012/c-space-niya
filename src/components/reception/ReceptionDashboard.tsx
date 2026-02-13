'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeftRight, Building2, Calendar, ChevronDown } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/modules/reception/lib/constants';
import { useServiceHub } from '@/contexts/ServiceHubContext';
import { useTranslation } from '@/contexts/LanguageContext';

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

const getPeriodLabels = (t: ReturnType<typeof useTranslation>['t']): Record<PeriodType, string> => ({
  today: t.reception.today,
  this_week: t.reception.thisWeek,
  this_month: t.reception.thisMonth,
  last_month: t.reception.lastMonth,
  this_quarter: t.reception.thisQuarter,
  this_year: t.reception.thisYear,
  all_time: t.reception.allTime,
  custom: t.reception.customRange,
});

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

function formatFullNumber(num: number): string {
  return Math.round(num).toLocaleString('en-US');
}

export default function ReceptionDashboard() {
  const { selectedBranchId } = useServiceHub();
  const { t } = useTranslation();
  const periodLabels = useMemo(() => getPeriodLabels(t), [t]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('this_month');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside the dropdown
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      setShowPeriodDropdown(false);
    };
    if (showPeriodDropdown) {
      // Use setTimeout to avoid immediate trigger
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
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
    if (selectedPeriod === 'all_time') return t.reception.allTime;
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
          <h1 className="text-2xl font-bold text-gray-900">{t.reception.incomeStatement}</h1>
          <p className="text-gray-500">{formatDateRangeDisplay()}</p>
        </div>

        {/* Period Selector */}
        <div className="relative" ref={dropdownRef}>
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
              className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-[500px] overflow-y-auto"
            >
              {/* Quick Select */}
              <div className="p-2 border-b border-gray-100">
                <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">{t.reception.quickSelect}</p>
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

              {/* Year Selector - Select year first, then quarter/month will use this year */}
              <div className="p-2 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="px-2 text-xs font-semibold text-gray-400 uppercase">{t.reception.selectYear}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickerYear(prev => prev - 1);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
                    >
                      ←
                    </button>
                    <span className="px-3 py-1 text-sm font-bold text-purple-700 bg-purple-100 rounded-lg min-w-[60px] text-center">
                      {pickerYear}
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickerYear(prev => prev + 1);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
                    >
                      →
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomFrom(`${pickerYear}-01-01`);
                    setCustomTo(`${pickerYear}-12-31`);
                    setSelectedPeriod('custom');
                    setShowPeriodDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg text-center transition-colors bg-gray-50 hover:bg-purple-100 hover:text-purple-700 text-gray-700 cursor-pointer font-medium"
                >
                  {t.reception.fullYear} {pickerYear}
                </button>
              </div>

              {/* Quarter Picker - Uses selected year */}
              <div className="p-2 border-b border-gray-100">
                <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">{t.reception.quarterOf} {pickerYear}</p>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: 'Q1', start: '01-01', end: '03-31' },
                    { label: 'Q2', start: '04-01', end: '06-30' },
                    { label: 'Q3', start: '07-01', end: '09-30' },
                    { label: 'Q4', start: '10-01', end: '12-31' },
                  ].map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomFrom(`${pickerYear}-${q.start}`);
                        setCustomTo(`${pickerYear}-${q.end}`);
                        setSelectedPeriod('custom');
                        setShowPeriodDropdown(false);
                      }}
                      className="px-2 py-2 text-sm rounded-lg text-center transition-colors hover:bg-purple-100 hover:text-purple-700 text-gray-700 cursor-pointer active:bg-purple-200"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month Picker - Uses selected year */}
              <div className="p-2 border-b border-gray-100">
                <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">{t.reception.monthOf} {pickerYear}</p>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: 'Jan', month: '01', days: '31' },
                    { label: 'Feb', month: '02', days: pickerYear % 4 === 0 ? '29' : '28' },
                    { label: 'Mar', month: '03', days: '31' },
                    { label: 'Apr', month: '04', days: '30' },
                    { label: 'May', month: '05', days: '31' },
                    { label: 'Jun', month: '06', days: '30' },
                    { label: 'Jul', month: '07', days: '31' },
                    { label: 'Aug', month: '08', days: '31' },
                    { label: 'Sep', month: '09', days: '30' },
                    { label: 'Oct', month: '10', days: '31' },
                    { label: 'Nov', month: '11', days: '30' },
                    { label: 'Dec', month: '12', days: '31' },
                  ].map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomFrom(`${pickerYear}-${m.month}-01`);
                        setCustomTo(`${pickerYear}-${m.month}-${m.days}`);
                        setSelectedPeriod('custom');
                        setShowPeriodDropdown(false);
                      }}
                      className="px-2 py-1.5 text-sm rounded-lg text-center transition-colors hover:bg-purple-100 hover:text-purple-700 text-gray-700 cursor-pointer active:bg-purple-200"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Range */}
              <div className="p-3">
                <p className="px-1 py-1 text-xs font-semibold text-gray-400 uppercase mb-2">{t.reception.customRange}</p>
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">{t.reception.from}</label>
                      <input
                        type="date"
                        value={customFrom || dateRange.from}
                        onFocus={() => {
                          if (!customFrom) setCustomFrom(dateRange.from);
                          if (!customTo) setCustomTo(dateRange.to);
                        }}
                        onChange={(e) => {
                          setCustomFrom(e.target.value);
                          setSelectedPeriod('custom');
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">{t.reception.to}</label>
                      <input
                        type="date"
                        value={customTo || dateRange.to}
                        onFocus={() => {
                          if (!customFrom) setCustomFrom(dateRange.from);
                          if (!customTo) setCustomTo(dateRange.to);
                        }}
                        onChange={(e) => {
                          setCustomTo(e.target.value);
                          setSelectedPeriod('custom');
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const fromDate = customFrom || dateRange.from;
                      const toDate = customTo || dateRange.to;
                      setCustomFrom(fromDate);
                      setCustomTo(toDate);
                      setSelectedPeriod('custom');
                      setShowPeriodDropdown(false);
                    }}
                    className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {t.reception.applyRange}
                  </button>
                </div>
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
                <p className="text-sm text-blue-600 font-medium">{t.reception.paid}</p>
                <p className="text-3xl font-bold text-blue-700">{formatFullNumber(stats?.income.paid || 0)}</p>
              </div>
            </Card>
            <Card className="border-2 border-blue-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-red-600 font-medium">{t.reception.debt}</p>
                <p className="text-3xl font-bold text-red-600">{formatFullNumber(stats?.income.debt || 0)}</p>
              </div>
            </Card>
          </div>

          {/* Expenses Row: OpEx | CapEx */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-blue-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-blue-600 font-medium">{t.reception.opex}</p>
                <p className="text-3xl font-bold text-blue-700">{formatFullNumber(stats?.expenses.opex || 0)}</p>
              </div>
            </Card>
            <Card className="border-2 border-blue-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-blue-600 font-medium">{t.reception.capex}</p>
                <p className="text-3xl font-bold text-blue-700">{formatFullNumber(stats?.expenses.capex || 0)}</p>
              </div>
            </Card>
          </div>

          {/* Top 5 Expense Categories */}
          <Card className="border-2 border-green-200 bg-white">
            <div className="p-2">
              <h3 className="font-semibold text-gray-900 mb-4">{t.reception.topExpenseCategories}</h3>
              {(stats?.expenses.topCategories && stats.expenses.topCategories.length > 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {stats.expenses.topCategories.map((cat) => (
                    <div key={cat.id} className="text-center">
                      <p className="text-sm text-red-600 font-medium">{cat.name}</p>
                      <p className="text-xl font-bold text-red-700">{formatFullNumber(cat.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">{t.reception.noExpensesInPeriod}</p>
              )}
            </div>
          </Card>

          {/* Profit Row: Operating Profit | Profit */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-green-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-green-600 font-medium">{t.reception.operatingProfit}</p>
                <p className={`text-3xl font-bold ${(stats?.profit.operating || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatFullNumber(stats?.profit.operating || 0)}
                </p>
              </div>
            </Card>
            <Card className="border-2 border-green-200 bg-white">
              <div className="p-2">
                <p className="text-sm text-green-600 font-medium">{t.reception.profit}</p>
                <p className={`text-3xl font-bold ${(stats?.profit.net || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatFullNumber(stats?.profit.net || 0)}
                </p>
              </div>
            </Card>
          </div>

          {/* Income by Service Type */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-purple-600" />
              {t.reception.incomeByServiceType}
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
                <p className="text-gray-400 text-sm">{t.reception.noTransactionsInPeriod}</p>
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">{t.reception.recentActivity}</h3>
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
                <p className="text-gray-400 text-sm text-center py-4">{t.reception.noRecentActivity}</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
