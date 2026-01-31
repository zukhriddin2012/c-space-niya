'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Wallet, Banknote, ArrowLeftRight, Receipt, Building2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/modules/reception/lib/constants';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';

interface DashboardStats {
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

export default function ReceptionDashboard() {
  const { selectedBranchId } = useReceptionMode();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedBranchId) {
        params.append('branchId', selectedBranchId);
      }
      const response = await fetch(`/api/reception/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

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
  const cashExpenses = stats?.expenses.byCash || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Today&apos;s overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-amber-700">Cash Expenses</p>
              <p className="text-xl font-bold text-amber-900">{formatCurrency(cashExpenses)}</p>
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
              <p className="text-gray-400 text-sm">No transactions today</p>
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
              <p className="text-gray-400 text-sm">No expenses today</p>
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
    </div>
  );
}
