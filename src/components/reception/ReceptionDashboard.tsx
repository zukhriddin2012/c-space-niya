'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useServiceHub, getOperatorHeaders } from '@/contexts/ServiceHubContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { QuickActionButtons } from '@/components/reception/QuickActionButtons';
import { RequestStatusCards } from '@/components/reception/RequestStatusCards';
import { CashSummaryWidget } from '@/components/reception/CashSummaryWidget';
import { ShiftsSummaryWidget } from '@/components/reception/ShiftsSummaryWidget';

interface DashboardData {
  requests: {
    legal: Record<string, number> | null;
    maintenance: (Record<string, number> & { slaBreached: number }) | null;
    accounting: Record<string, number> | null;
  };
  cash: {
    totalBalance: number;
    inkassoPendingCount: number;
    inkassoPendingAmount: number;
    transferThreshold: number;
    isOverThreshold: boolean;
  } | null;
  shifts: {
    today: {
      date: string;
      dayShift: { assigned: number; required: number; employees: Array<{ employeeId: string; employeeName: string; employeeStatus: string }> };
      nightShift: { assigned: number; required: number; employees: Array<{ employeeId: string; employeeName: string; employeeStatus: string }> };
    };
    week: {
      weekStart: string;
      days: Array<{
        date: string;
        dayOfWeek: string;
        dayCount: number;
        nightCount: number;
        dayRequired: number;
        nightRequired: number;
      }>;
    };
    myShifts: Array<{ date: string; shiftType: 'day' | 'night'; branchName: string }>;
  } | null;
}

interface ReceptionDashboardProps {
  onTabChange?: (tab: string) => void;
  onQuickAction?: (action: 'new-transaction' | 'new-expense') => void;
}

export default function ReceptionDashboard({ onTabChange, onQuickAction }: ReceptionDashboardProps) {
  const { selectedBranchId, currentOperator } = useServiceHub();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!selectedBranchId) return;

    setIsLoading(true);
    setError(null);
    try {
      const headers = getOperatorHeaders(
        currentOperator,
        currentOperator?.id || '',
        selectedBranchId
      );

      const params = new URLSearchParams({ branchId: selectedBranchId });
      const response = await fetch(`/api/reception/service-hub-dashboard?${params}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result: DashboardData = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, currentOperator]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleQuickAction = useCallback((action: 'new-transaction' | 'new-expense') => {
    onQuickAction?.(action);
  }, [onQuickAction]);

  const handleNavigateRequests = useCallback(() => {
    onTabChange?.('requests');
  }, [onTabChange]);

  const handleNavigateCash = useCallback(() => {
    onTabChange?.('cash-management');
  }, [onTabChange]);

  const handleNavigateShifts = useCallback(() => {
    onTabChange?.('shifts');
  }, [onTabChange]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Action Buttons */}
      <QuickActionButtons onAction={handleQuickAction} />

      {/* Main Grid: Requests + Cash | Shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Requests + Cash (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <RequestStatusCards
            data={data?.requests || null}
            isLoading={isLoading}
            onNavigate={handleNavigateRequests}
          />
          <CashSummaryWidget
            data={data?.cash || null}
            isLoading={isLoading}
            onNavigate={handleNavigateCash}
          />
        </div>

        {/* Right column: Shifts (1/3 width) */}
        <div>
          <ShiftsSummaryWidget
            data={data?.shifts || null}
            isLoading={isLoading}
            onNavigate={handleNavigateShifts}
          />
        </div>
      </div>
    </div>
  );
}
