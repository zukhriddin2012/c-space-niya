'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, X, Eye, Ban, ChevronLeft, ChevronRight, Building2, Calendar, Clock, User, ArrowUpDown, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { formatCurrency, EXPENSE_PAYMENT_METHODS_LIST } from '@/modules/reception/lib/constants';
import { useServiceHub, getOperatorHeaders } from '@/contexts/ServiceHubContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type { Expense, ExpenseType, CreateExpenseInput } from '@/modules/reception/types';

type QuickDateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

// ============================================
// DATE HELPERS - Using LOCAL dates to fix timezone bug!
// ============================================

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return null;
};

function getDateRange(filter: QuickDateFilter): { from: string; to: string } | null {
  const today = new Date();
  switch (filter) {
    case 'today':
      return { from: getLocalDateString(today), to: getLocalDateString(today) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: getLocalDateString(yesterday), to: getLocalDateString(yesterday) };
    }
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { from: getLocalDateString(weekStart), to: getLocalDateString(today) };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: getLocalDateString(monthStart), to: getLocalDateString(today) };
    }
    case 'all':
    case 'custom':
    default:
      return null;
  }
}

interface ExpenseFormData {
  subject: string;
  expenseTypeId: string;
  amount: string;
  paymentMethod: 'cash' | 'bank';
  description: string;
  expenseDate: string;
}

const initialFormData: ExpenseFormData = {
  subject: '',
  expenseTypeId: '',
  amount: '',
  paymentMethod: 'cash',
  description: '',
  expenseDate: new Date().toISOString().split('T')[0],
};

export default function ReceptionExpenses({ autoOpenCreate, onAutoOpenConsumed }: { autoOpenCreate?: boolean; onAutoOpenConsumed?: () => void } = {}) {
  const { selectedBranchId, currentOperator } = useServiceHub();
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);

  // CSN-030: Auto-open create modal when triggered from dashboard quick action
  useEffect(() => {
    if (autoOpenCreate) {
      setShowAddModal(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpenCreate, onAutoOpenConsumed]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpenseType, setFilterExpenseType] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [quickDateFilter, setQuickDateFilter] = useState<QuickDateFilter>('today');
  const [filterDateFrom, setFilterDateFrom] = useState(() => getLocalDateString());
  const [filterDateTo, setFilterDateTo] = useState(() => getLocalDateString());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showBranchColumn, setShowBranchColumn] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'created'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 15;

  // PR2-066: Cash management - OpEx balance awareness
  const [opexAvailable, setOpexAvailable] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Toggle sort
  const handleSort = (column: 'date' | 'amount' | 'created') => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Sort icon helper
  const SortIcon = ({ column }: { column: 'date' | 'amount' | 'created' }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortOrder === 'desc'
      ? <ArrowDown className="w-3 h-3 ml-1 text-purple-600" />
      : <ArrowUp className="w-3 h-3 ml-1 text-purple-600" />;
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/reception/admin/expense-types?activeOnly=true');
        if (response.ok) setExpenseTypes(await response.json());
      } catch {
        console.error('Failed to fetch expense types');
      }
    };
    fetchConfig();
  }, []);

  // Compute effective date range based on quick filter or custom dates
  const effectiveDateRange = useMemo(() => {
    if (quickDateFilter === 'custom') {
      return { from: filterDateFrom, to: filterDateTo };
    }
    return getDateRange(quickDateFilter);
  }, [quickDateFilter, filterDateFrom, filterDateTo]);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      if (selectedBranchId) params.append('branchId', selectedBranchId);
      if (searchQuery) params.append('search', searchQuery);
      if (filterExpenseType) params.append('expenseTypeId', filterExpenseType);
      if (filterPaymentMethod) params.append('paymentMethod', filterPaymentMethod);
      if (effectiveDateRange) {
        params.append('dateFrom', effectiveDateRange.from);
        params.append('dateTo', effectiveDateRange.to);
      }

      const response = await fetch(`/api/reception/expenses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      setExpenses(data.data || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      setShowBranchColumn(data.showBranchColumn || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedBranchId, searchQuery, filterExpenseType, filterPaymentMethod, effectiveDateRange, sortBy, sortOrder]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.expenseTypeId) errors.expenseTypeId = 'Expense type is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.amount = 'Valid amount is required';
    if (!formData.paymentMethod) errors.paymentMethod = 'Payment method is required';
    if (!formData.expenseDate) errors.expenseDate = 'Date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload: CreateExpenseInput = {
        subject: formData.subject.trim(),
        expenseTypeId: formData.expenseTypeId,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        description: formData.description.trim() || undefined,
        expenseDate: formData.expenseDate,
      };
      const response = await fetch('/api/reception/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getOperatorHeaders(currentOperator, 'self', selectedBranchId) },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create expense');
      }
      setShowAddModal(false);
      setFormData(initialFormData);
      setFormErrors({});
      fetchExpenses();
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : 'Failed to create expense' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async () => {
    if (!selectedExpense || !voidReason.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reception/expenses/${selectedExpense.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getOperatorHeaders(currentOperator, 'self', selectedBranchId) },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to void expense');
      }
      setShowVoidModal(false);
      setSelectedExpense(null);
      setVoidReason('');
      fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDateFilter = (filter: QuickDateFilter) => {
    setQuickDateFilter(filter);
    if (filter !== 'custom') {
      const range = getDateRange(filter);
      if (range) {
        setFilterDateFrom(range.from);
        setFilterDateTo(range.to);
      }
    }
    setPage(1);
  };

  const handleCustomDateChange = (from: string, to: string) => {
    setQuickDateFilter('custom');
    setFilterDateFrom(from);
    setFilterDateTo(to);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterExpenseType('');
    setFilterPaymentMethod('');
    setQuickDateFilter('today');
    const today = getLocalDateString();
    setFilterDateFrom(today);
    setFilterDateTo(today);
    setPage(1);
  };

  const hasActiveFilters = searchQuery || filterExpenseType || filterPaymentMethod || quickDateFilter !== 'today';

  // PR2-066: Fetch OpEx balance when add modal opens with cash payment
  const fetchOpexBalance = useCallback(async () => {
    if (!selectedBranchId) return;
    setIsLoadingBalance(true);
    try {
      const response = await fetch(`/api/reception/cash-management/summary?branchId=${selectedBranchId}`);
      if (response.ok) {
        const data = await response.json();
        setOpexAvailable(data.balance?.allocation?.opex?.available ?? null);
      }
    } catch {
      // Non-blocking: balance display is informational only
    } finally {
      setIsLoadingBalance(false);
    }
  }, [selectedBranchId]);

  // Fetch balance when modal opens
  useEffect(() => {
    if (showAddModal && formData.paymentMethod === 'cash') {
      fetchOpexBalance();
    }
  }, [showAddModal, formData.paymentMethod, fetchOpexBalance]);

  const expenseAmountNum = parseFloat(formData.amount) || 0;
  const wouldExceedOpex = opexAvailable !== null && formData.paymentMethod === 'cash' && expenseAmountNum > opexAvailable;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.reception.expenses}</h1>
          <p className="text-gray-500">{t.reception.recordExpenses}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t.reception.newExpense}
        </Button>
      </div>

      <Card>
        {/* Quick Date Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-gray-400" />
          {(['today', 'yesterday', 'week', 'month', 'all'] as QuickDateFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => handleQuickDateFilter(filter)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                quickDateFilter === filter
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter === 'today' && t.reception.today}
              {filter === 'yesterday' && t.reception.yesterday}
              {filter === 'week' && t.reception.thisWeek}
              {filter === 'month' && t.reception.thisMonth}
              {filter === 'all' && t.reception.allTime}
            </button>
          ))}
          {quickDateFilter === 'custom' && (
            <span className="px-3 py-1.5 text-sm font-medium bg-purple-100 text-purple-700 rounded-lg">
              {filterDateFrom} → {filterDateTo}
            </span>
          )}
        </div>

        {/* Search and Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t.reception.searchExpenses}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <Button variant={showFilters ? 'primary' : 'secondary'} onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            {t.reception.moreFilters}
            {(filterExpenseType || filterPaymentMethod) && <span className="ml-2 w-2 h-2 bg-purple-500 rounded-full" />}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <select value={filterExpenseType} onChange={(e) => { setFilterExpenseType(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Types</option>
                {expenseTypes.map((et) => (<option key={et.id} value={et.id}>{et.icon} {et.name}</option>))}
              </select>
              <select value={filterPaymentMethod} onChange={(e) => { setFilterPaymentMethod(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Payments</option>
                {EXPENSE_PAYMENT_METHODS_LIST.map((pm) => (<option key={pm.value} value={pm.value}>{pm.icon} {pm.label}</option>))}
              </select>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => handleCustomDateChange(e.target.value, filterDateTo)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => handleCustomDateChange(filterDateFrom, e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" />{t.reception.resetToToday}</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <button
                    onClick={() => handleSort('date')}
                    className="inline-flex items-center hover:text-gray-700"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    Date & Time
                    <SortIcon column="date" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                {showBranchColumn && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  <button
                    onClick={() => handleSort('amount')}
                    className="inline-flex items-center hover:text-gray-700 ml-auto"
                  >
                    Amount
                    <SortIcon column="amount" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={showBranchColumn ? 9 : 8} className="px-4 py-12 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto" />
                </td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={showBranchColumn ? 9 : 8} className="px-4 py-12 text-center text-gray-500">No expenses found</td></tr>
              ) : (
                expenses.map((e) => {
                  const relativeTime = e.createdAt ? getRelativeTime(e.createdAt) : null;
                  const isRecent = relativeTime && !relativeTime.includes('d ago') && relativeTime !== 'Yesterday';

                  return (
                    <tr key={e.id} className={`${e.isVoided ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'} ${isRecent ? 'bg-purple-50/30' : ''}`}>
                      {/* Date & Time */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {e.expenseDate ? formatDate(e.expenseDate) : '-'}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {e.createdAt ? formatTime(e.createdAt) : '-'}
                            {relativeTime && (
                              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isRecent ? 'bg-purple-100 text-purple-700' : 'text-gray-400'}`}>
                                {relativeTime}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      {/* Expense (Number + Subject) */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{e.subject}</span>
                          <span className="text-xs text-gray-400 font-mono">{e.expenseNumber || '-'}</span>
                        </div>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md text-sm">
                          <span>{e.expenseType?.icon}</span>
                          <span className="text-gray-700">{e.expenseType?.name}</span>
                        </span>
                      </td>
                      {/* Payment */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm ${
                          e.paymentMethod === 'cash' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          <span>{e.paymentMethod === 'cash' ? '💵' : '🏦'}</span>
                          <span className="capitalize">{e.paymentMethod}</span>
                        </span>
                      </td>
                      {/* Branch */}
                      {showBranchColumn && (
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                            <Building2 className="w-3 h-3" />
                            {e.branchName || '-'}
                          </span>
                        </td>
                      )}
                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-red-600 text-lg">{formatCurrency(e.amount)}</span>
                      </td>
                      {/* Recorded By */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          <User className="w-3.5 h-3.5" />
                          {e.recordedByName || '-'}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {e.isVoided ? <Badge variant="danger">Voided</Badge> : <Badge variant="success">Active</Badge>}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => { setSelectedExpense(e); setShowViewModal(true); }}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!e.isVoided && (
                            <button
                              onClick={() => { setSelectedExpense(e); setShowVoidModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Void expense"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">{totalCount} expenses</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm">{page}/{totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setFormData(initialFormData); setFormErrors({}); setOpexAvailable(null); }} title="New Expense" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.submit && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formErrors.submit}</div>}

          {/* PR2-066: OpEx balance info for cash expenses */}
          {formData.paymentMethod === 'cash' && opexAvailable !== null && (
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${
              wouldExceedOpex
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
            }`}>
              {wouldExceedOpex ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              ) : (
                <span className="text-green-500 mt-0.5 flex-shrink-0">💰</span>
              )}
              <div className="text-sm">
                <p className={wouldExceedOpex ? 'text-amber-800 font-medium' : 'text-green-800'}>
                  {t.cashManagement.opexAvailable}: {formatCurrency(opexAvailable)}
                </p>
                {wouldExceedOpex && (
                  <p className="text-amber-600 mt-1">
                    This expense exceeds OpEx balance. Consider using{' '}
                    <a href="/reception/cash-management" className="underline font-medium hover:text-amber-800">
                      {t.cashManagement.requestDividendSpend}
                    </a>{' '}
                    for the excess amount.
                  </p>
                )}
              </div>
            </div>
          )}
          {formData.paymentMethod === 'cash' && isLoadingBalance && (
            <div className="text-xs text-gray-400 italic">Loading OpEx balance...</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input label="Subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="What was this expense for?" error={formErrors.subject} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type *</label>
              <select value={formData.expenseTypeId} onChange={(e) => setFormData({ ...formData, expenseTypeId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.expenseTypeId ? 'border-red-300' : 'border-gray-200'}`} required>
                <option value="">Select type</option>
                {expenseTypes.map((et) => (<option key={et.id} value={et.id}>{et.icon} {et.name}</option>))}
              </select>
              {formErrors.expenseTypeId && <p className="mt-1 text-sm text-red-600">{formErrors.expenseTypeId}</p>}
            </div>
            <Input label="Amount (UZS)" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0" min="0" step="1000" error={formErrors.amount} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'cash' | 'bank' })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.paymentMethod ? 'border-red-300' : 'border-gray-200'}`} required>
                {EXPENSE_PAYMENT_METHODS_LIST.map((pm) => (<option key={pm.value} value={pm.value}>{pm.icon} {pm.label}</option>))}
              </select>
              {formErrors.paymentMethod && <p className="mt-1 text-sm text-red-600">{formErrors.paymentMethod}</p>}
            </div>
            <Input label="Date" type="date" value={formData.expenseDate} onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })} error={formErrors.expenseDate} required />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Additional details" rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setShowAddModal(false); setFormData(initialFormData); setFormErrors({}); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedExpense(null); }} title="Expense Details" size="lg">
        {selectedExpense && (
          <div className="space-y-4">
            {/* Header with Amount */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-semibold text-gray-600">{selectedExpense.expenseNumber}</span>
                {selectedExpense.isVoided ? <Badge variant="danger">Voided</Badge> : <Badge variant="success">Active</Badge>}
              </div>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(selectedExpense.amount)}</p>
            </div>

            {/* Subject */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Subject</p>
              <p className="font-medium text-lg">{selectedExpense.subject}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {selectedExpense.expenseDate ? formatDate(selectedExpense.expenseDate) : '-'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time Created</p>
                <p className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {selectedExpense.createdAt ? formatTime(selectedExpense.createdAt) : '-'}
                  {selectedExpense.createdAt && getRelativeTime(selectedExpense.createdAt) && (
                    <span className="text-xs text-gray-400">({getRelativeTime(selectedExpense.createdAt)})</span>
                  )}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</p>
                <p className="font-medium">{selectedExpense.expenseType?.icon} {selectedExpense.expenseType?.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment Method</p>
                <p className="font-medium capitalize">{selectedExpense.paymentMethod === 'cash' ? '💵' : '🏦'} {selectedExpense.paymentMethod}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Recorded By</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {selectedExpense.recordedByName || '-'}
                </p>
              </div>
              {selectedExpense.branchName && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Branch</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {selectedExpense.branchName}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedExpense.description && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700">{selectedExpense.description}</p>
              </div>
            )}

            {/* Voided Info */}
            {selectedExpense.isVoided && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <Ban className="w-4 h-4" />
                  Expense Voided
                </p>
                <p className="text-sm text-red-600 mt-1">Reason: {selectedExpense.voidReason || 'N/A'}</p>
                {selectedExpense.voidedAt && (
                  <p className="text-xs text-red-500 mt-1">Voided at: {formatDate(selectedExpense.voidedAt)} {formatTime(selectedExpense.voidedAt)}</p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => { setShowViewModal(false); setSelectedExpense(null); }}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showVoidModal} onClose={() => { setShowVoidModal(false); setSelectedExpense(null); setVoidReason(''); }} title="Void Expense" size="md">
        {selectedExpense && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">Void <strong>{selectedExpense.expenseNumber}</strong> for <strong>{formatCurrency(selectedExpense.amount)}</strong>?</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Enter reason" rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => { setShowVoidModal(false); setSelectedExpense(null); setVoidReason(''); }}>Cancel</Button>
              <Button variant="danger" onClick={handleVoid} disabled={isSubmitting || !voidReason.trim()}>{isSubmitting ? 'Voiding...' : 'Void'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
