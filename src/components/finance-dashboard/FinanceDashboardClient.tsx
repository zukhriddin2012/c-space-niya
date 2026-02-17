'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import PeriodSelector from './PeriodSelector';
import KPICards from './KPICards';
import BranchPerformanceGrid from './BranchPerformanceGrid';
import BreakdownCharts from './BreakdownCharts';
import Button from '@/components/ui/Button';
import type { FinanceDashboardResponse } from '@/modules/finance-dashboard/types';

function getThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

export default function FinanceDashboardClient() {
  const thisMonth = getThisMonth();
  const [startDate, setStartDate] = useState(thisMonth.start);
  const [endDate, setEndDate] = useState(thisMonth.end);
  const [data, setData] = useState<FinanceDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dashboard/finances?startDate=${start}&endDate=${end}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load dashboard');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(startDate, endDate);
  }, [startDate, endDate, fetchDashboard]);

  function handlePeriodChange(start: string, end: string) {
    setStartDate(start);
    setEndDate(end);
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Revenue, expenses, and profit splits across all branches</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector startDate={startDate} endDate={endDate} onPeriodChange={handlePeriodChange} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchDashboard(startDate, endDate)}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-2" />
          <span className="text-gray-500">Loading dashboard...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={() => fetchDashboard(startDate, endDate)}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
          <KPICards comparison={data.comparison} />
          <BranchPerformanceGrid branches={data.branches} />
          <BreakdownCharts
            revenueByServiceType={data.breakdowns.revenueByServiceType}
            expensesByCategory={data.breakdowns.expensesByCategory}
            revenueByPaymentMethod={data.breakdowns.revenueByPaymentMethod}
            paymentMethodsByBranch={data.breakdowns.paymentMethodsByBranch}
          />
        </div>
      ) : null}
    </div>
  );
}
