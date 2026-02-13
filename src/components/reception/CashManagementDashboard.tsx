'use client';

import React, { useState, useEffect } from 'react';
import { Banknote, Receipt, ArrowRight, AlertTriangle, TrendingUp, FileCheck, Send, ClipboardCheck } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/modules/reception/lib/constants';
import { useServiceHub } from '@/contexts/ServiceHubContext';
import type { CashPositionSummary } from '@/modules/reception/types';

/**
 * CashManagementDashboard — Shared component for cash management overview.
 * Used by both the standalone kiosk (StandaloneReceptionUI) and previously
 * the dashboard reception overlay. Extracted from the route file as part of
 * CSN-028 (ServiceHub migration) to break the cross-boundary import.
 *
 * Note: The "Quick Actions" section previously used <Link> to sub-pages
 * (/reception/cash-management/inkasso-deliveries, /transfers, /dividend-requests).
 * These sub-pages are being deleted as part of CSN-028. The links have been
 * converted to informational cards (no navigation) since the sub-page content
 * was only meaningful within the dashboard route context.
 */
export function CashManagementDashboard() {
  const [summary, setSummary] = useState<CashPositionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedBranch } = useServiceHub();

  useEffect(() => {
    if (selectedBranch?.id && !selectedBranch.isAllBranches) {
      fetchSummary(selectedBranch.id);
    }
  }, [selectedBranch?.id]);

  const fetchSummary = async (branchId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reception/cash-management/summary?branchId=${branchId}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedBranch?.isAllBranches) {
    return (
      <div className="text-center py-12">
        <Banknote className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">Select a Branch</h2>
        <p className="text-gray-500 mt-2">Cash management is branch-specific. Please select a branch.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'No data'}</p>
        <button onClick={() => selectedBranch?.id && fetchSummary(selectedBranch.id)}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
          Retry
        </button>
      </div>
    );
  }

  const { balance, inkasso, recentTransfers, pendingDividendRequests } = summary;
  const { allocation } = balance;

  return (
    <div className="space-y-6">
      {/* Threshold Warning */}
      {balance.thresholdExceeded && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Transfer threshold exceeded</p>
            <p className="text-sm text-amber-600">
              Non-inkasso cash balance ({formatCurrency(balance.totalNonInkassoCash)}) exceeds
              the {formatCurrency(balance.settings.transferThreshold)} threshold.
              GM should collect from Reception Safe.
            </p>
          </div>
        </div>
      )}

      {/* Allocation Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* OpEx */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-amber-800">OpEx ({allocation.opex.percentage}%)</h3>
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Fixed</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(allocation.opex.available)}</p>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Allocated</span>
                <span>{formatCurrency(allocation.opex.allocated)}</span>
              </div>
              <div className="flex justify-between">
                <span>Spent</span>
                <span className="text-red-500">-{formatCurrency(allocation.opex.spent)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Marketing/Charity */}
        <Card className="border-l-4 border-l-pink-500">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-pink-800">Marketing ({allocation.marketing.percentage}%)</h3>
            </div>
            <p className="text-2xl font-bold text-pink-700">{formatCurrency(allocation.marketing.available)}</p>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Allocated</span>
                <span>{formatCurrency(allocation.marketing.allocated)}</span>
              </div>
              <div className="flex justify-between">
                <span>Transferred</span>
                <span className="text-red-500">-{formatCurrency(allocation.marketing.spent)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Dividend */}
        <Card className="border-l-4 border-l-purple-500">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-purple-800">Dividend ({allocation.dividend.percentage}%)</h3>
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(allocation.dividend.available)}</p>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Allocated</span>
                <span>{formatCurrency(allocation.dividend.allocated)}</span>
              </div>
              <div className="flex justify-between">
                <span>Spent (approved)</span>
                <span className="text-red-500">-{formatCurrency(allocation.dividend.spent)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-500">Total Cash</span>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(balance.totalNonInkassoCash)}</p>
            <p className="text-xs text-gray-400">Since last transfer</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Receipt className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-500">Inkasso Pending</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(inkasso.pending.amount)}</p>
            <p className="text-xs text-gray-400">{inkasso.pending.count} transactions</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FileCheck className="w-5 h-5 text-teal-500" />
              <span className="text-sm text-gray-500">Inkasso Delivered</span>
            </div>
            <p className="text-xl font-bold text-teal-600">{formatCurrency(inkasso.deliveredThisMonth.amount)}</p>
            <p className="text-xs text-gray-400">{inkasso.deliveredThisMonth.count} this month</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ClipboardCheck className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-gray-500">Dividend Requests</span>
            </div>
            <p className="text-xl font-bold text-orange-600">{pendingDividendRequests.count}</p>
            <p className="text-xs text-gray-400">{formatCurrency(pendingDividendRequests.totalAmount)} pending</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions (informational cards — sub-pages removed in CSN-028) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200">
          <div className="flex items-center gap-4 p-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Inkasso Deliveries</h3>
              <p className="text-sm text-gray-500">{inkasso.pending.count} pending delivery</p>
            </div>
          </div>
        </Card>

        <Card className="border-purple-200">
          <div className="flex items-center gap-4 p-2">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Safe Transfers</h3>
              <p className="text-sm text-gray-500">{recentTransfers.length} recent transfers</p>
            </div>
          </div>
        </Card>

        <Card className="border-orange-200">
          <div className="flex items-center gap-4 p-2">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Dividend Approvals</h3>
              <p className="text-sm text-gray-500">{pendingDividendRequests.count} pending approval</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Transfers */}
      {recentTransfers.length > 0 && (
        <Card title="Recent Transfers" noPadding>
          <div className="divide-y divide-gray-100">
            {recentTransfers.map((transfer) => (
              <div key={transfer.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(transfer.totalAmount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {transfer.transferredByName} &middot; {new Date(transfer.transferDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>D: {formatCurrency(transfer.dividendAmount)}</div>
                  <div>M: {formatCurrency(transfer.marketingAmount)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default CashManagementDashboard;
