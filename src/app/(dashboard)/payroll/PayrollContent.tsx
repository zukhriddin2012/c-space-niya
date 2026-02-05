'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PayrollFilters from './PayrollFilters';
import PayrollActions from './PayrollActions';
import PaymentRequestsSection from './PaymentRequestsSection';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function getMonthName(month: number, year: number) {
  return new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

interface PayrollData {
  payroll: any[];
  stats: {
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    primaryNet: number;
    additionalTotal: number;
    paid: number;
    approved: number;
    draft: number;
    totalEmployees: number;
  };
  paymentRequestsSummary: any;
  paidAdvances: Record<string, number>;
  year: number;
  month: number;
}

interface NotificationStats {
  total: number;
  advance: number;
  wage: number;
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5 animate-pulse">
      <div className="w-20 h-3 bg-gray-200 rounded mb-2" />
      <div className="w-28 h-6 bg-gray-200 rounded mb-1" />
      <div className="w-16 h-3 bg-gray-200 rounded hidden sm:block" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 animate-pulse">
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-4">
          <div className="w-32 h-10 bg-gray-200 rounded" />
          <div className="w-32 h-10 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="w-32 h-4 bg-gray-200 rounded mb-1" />
              <div className="w-20 h-3 bg-gray-200 rounded" />
            </div>
            <div className="w-24 h-4 bg-gray-200 rounded" />
            <div className="w-20 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface PayrollContentProps {
  canProcessPayroll: boolean;
  canApprovePayroll: boolean;
}

export default function PayrollContent({ canProcessPayroll, canApprovePayroll }: PayrollContentProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PayrollData | null>(null);
  const [notificationStats, setNotificationStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const selectedYear = parseInt(searchParams.get('year') || String(currentDate.getFullYear()));
  const selectedMonth = parseInt(searchParams.get('month') || String(currentDate.getMonth() + 1));
  const selectedStatus = searchParams.get('status') || '';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch payroll data and notification stats in parallel
        const [payrollRes, notifyStatsRes] = await Promise.all([
          fetch(`/api/payroll/dashboard?year=${selectedYear}&month=${selectedMonth}`),
          fetch(`/api/payment-requests/notify-all?year=${selectedYear}&month=${selectedMonth}`),
        ]);

        if (payrollRes.ok) {
          const payrollData = await payrollRes.json();
          setData(payrollData);
        }

        if (notifyStatsRes.ok) {
          const statsData = await notifyStatsRes.json();
          setNotificationStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching payroll:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedYear, selectedMonth]);

  const refreshData = async () => {
    try {
      const res = await fetch(`/api/payroll/dashboard?year=${selectedYear}&month=${selectedMonth}`);
      if (res.ok) {
        const payrollData = await res.json();
        setData(payrollData);
      }
    } catch (error) {
      console.error('Error refreshing payroll:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 lg:mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Payroll</h1>
          <p className="text-sm lg:text-base text-gray-500 mt-1">
            <span className="hidden sm:inline">Manage employee wages and payment processing for </span>
            <span className="sm:hidden">Wages for </span>
            {getMonthName(selectedMonth, selectedYear)}
          </p>
        </div>
        {data && (
          <PayrollActions
            payroll={data.payroll}
            year={selectedYear}
            month={selectedMonth}
            canProcess={canProcessPayroll}
            notificationStats={notificationStats || undefined}
          />
        )}
      </div>

      {/* Filters */}
      <PayrollFilters
        currentYear={selectedYear}
        currentMonth={selectedMonth}
        currentStatus={selectedStatus}
      />

      {/* Summary Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5">
            <p className="text-xs lg:text-sm text-gray-500 mb-1">Total Gross</p>
            <p className="text-base lg:text-xl font-semibold text-gray-900">
              {formatCurrency(data.stats.totalGross)}
            </p>
            <p className="text-xs text-gray-400 mt-1 hidden sm:block">{data.stats.totalEmployees} employees</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5">
            <p className="text-xs lg:text-sm text-gray-500 mb-1">Deductions</p>
            <p className="text-base lg:text-xl font-semibold text-red-600">
              -{formatCurrency(data.stats.totalDeductions)}
            </p>
            <p className="text-xs text-gray-400 mt-1 hidden sm:block">12% tax on Primary</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5">
            <p className="text-xs lg:text-sm text-gray-500 mb-1">Net Payable</p>
            <p className="text-base lg:text-xl font-semibold text-green-600">
              {formatCurrency(data.stats.totalNet)}
            </p>
            <div className="text-xs text-gray-400 mt-1 hidden sm:block space-y-0.5">
              <p>Primary: {formatCurrency(data.stats.primaryNet)}</p>
              <p>Additional: {formatCurrency(data.stats.additionalTotal)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5">
            <p className="text-xs lg:text-sm text-gray-500 mb-1">Status</p>
            <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1">
              <span className="text-xs lg:text-sm">
                <span className="font-semibold text-green-600">{data.stats.paid}</span> <span className="hidden lg:inline">Paid</span><span className="lg:hidden">P</span>
              </span>
              <span className="text-xs lg:text-sm">
                <span className="font-semibold text-blue-600">{data.stats.approved}</span> <span className="hidden lg:inline">Approved</span><span className="lg:hidden">A</span>
              </span>
              <span className="text-xs lg:text-sm">
                <span className="font-semibold text-yellow-600">{data.stats.draft}</span> <span className="hidden lg:inline">Draft</span><span className="lg:hidden">D</span>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Payment Requests Section */}
      {loading ? (
        <TableSkeleton />
      ) : data ? (
        <PaymentRequestsSection
          year={selectedYear}
          month={selectedMonth}
          payroll={data.payroll}
          summary={data.paymentRequestsSummary}
          paidAdvances={data.paidAdvances}
          canProcess={canProcessPayroll}
          canApprove={canApprovePayroll}
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          Failed to load payroll data
        </div>
      )}
    </div>
  );
}
