'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, X, Eye, Ban, ChevronLeft, ChevronRight, Building2, Calendar, Clock, User, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/modules/reception/lib/constants';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { ClientAutocomplete, CreateClientModal } from '@/components/reception';
import type { ClientOption } from '@/components/reception';
import type { Transaction, ServiceType, PaymentMethodConfig, CreateTransactionInput } from '@/modules/reception/types';

type QuickDateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

// ============================================
// DATE HELPERS - Using LOCAL dates to fix timezone bug!
// ============================================

// Get local date in YYYY-MM-DD format (fixes UTC timezone bug)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format date for display (handles date-only strings properly)
function formatDisplayDate(dateString: string): string {
  // Add time component to parse as local date, not UTC
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Format short date (day + month)
function formatShortDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Format time from timestamp
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Get relative time
function getRelativeTime(dateString: string): string | null {
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
}

// Helper to get date range for quick filters
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

// Check if a date string is today
function isToday(dateStr: string): boolean {
  return dateStr === getLocalDateString();
}

interface TransactionFormData {
  customerName: string;
  serviceTypeId: string;
  amount: string;
  paymentMethodId: string;
  transactionCode: string;
  notes: string;
  transactionDate: string;
}

// Use local date to fix timezone bug
const initialFormData: TransactionFormData = {
  customerName: '',
  serviceTypeId: '',
  amount: '',
  paymentMethodId: '',
  transactionCode: '',
  notes: '',
  transactionDate: getLocalDateString(),
};

export default function ReceptionTransactions() {
  const { selectedBranchId } = useReceptionMode();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [createClientInitialName, setCreateClientInitialName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
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

  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === formData.paymentMethodId);
  const requiresTransactionCode = selectedPaymentMethod?.requiresCode || false;

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [serviceTypesRes, paymentMethodsRes] = await Promise.all([
          fetch('/api/reception/admin/service-types?activeOnly=true'),
          fetch('/api/reception/admin/payment-methods?activeOnly=true'),
        ]);
        if (serviceTypesRes.ok) setServiceTypes(await serviceTypesRes.json());
        if (paymentMethodsRes.ok) setPaymentMethods(await paymentMethodsRes.json());
      } catch {
        console.error('Failed to fetch config');
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

  const fetchTransactions = useCallback(async () => {
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
      if (filterServiceType) params.append('serviceTypeId', filterServiceType);
      if (filterPaymentMethod) params.append('paymentMethodId', filterPaymentMethod);
      if (effectiveDateRange) {
        params.append('dateFrom', effectiveDateRange.from);
        params.append('dateTo', effectiveDateRange.to);
      }

      const response = await fetch(`/api/reception/transactions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      setTransactions(data.data || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      setShowBranchColumn(data.showBranchColumn || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedBranchId, searchQuery, filterServiceType, filterPaymentMethod, effectiveDateRange, sortBy, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!selectedClient?.name && !formData.customerName.trim()) errors.customerName = 'Customer is required';
    if (!formData.serviceTypeId) errors.serviceTypeId = 'Service type is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.amount = 'Valid amount is required';
    if (!formData.paymentMethodId) errors.paymentMethodId = 'Payment method is required';
    if (requiresTransactionCode && !formData.transactionCode.trim()) {
      errors.transactionCode = 'Transaction code is required for this payment method';
    }
    if (!formData.transactionDate) errors.transactionDate = 'Transaction date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload: CreateTransactionInput = {
        customerName: selectedClient?.name || formData.customerName.trim(),
        clientId: selectedClient?.id,
        serviceTypeId: formData.serviceTypeId,
        amount: parseFloat(formData.amount),
        paymentMethodId: formData.paymentMethodId,
        transactionCode: formData.transactionCode.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        transactionDate: formData.transactionDate,
      };
      const response = await fetch('/api/reception/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create transaction');
      }
      setShowAddModal(false);
      setFormData(initialFormData);
      setFormErrors({});
      setSelectedClient(null);
      fetchTransactions();
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : 'Failed to create transaction' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async () => {
    if (!selectedTransaction || !voidReason.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reception/transactions/${selectedTransaction.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to void transaction');
      }
      setShowVoidModal(false);
      setSelectedTransaction(null);
      setVoidReason('');
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void transaction');
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
    setFilterServiceType('');
    setFilterPaymentMethod('');
    setQuickDateFilter('today');
    const today = getLocalDateString();
    setFilterDateFrom(today);
    setFilterDateTo(today);
    setPage(1);
  };

  const hasActiveFilters = searchQuery || filterServiceType || filterPaymentMethod || quickDateFilter !== 'today';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.reception.transactions}</h1>
          <p className="text-gray-500">{t.reception.recordSales}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t.reception.newTransaction}
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
              placeholder={t.reception.searchTransactions}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <Button variant={showFilters ? 'primary' : 'secondary'} onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            {t.reception.moreFilters}
            {(filterServiceType || filterPaymentMethod) && <span className="ml-2 w-2 h-2 bg-purple-500 rounded-full" />}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <select value={filterServiceType} onChange={(e) => { setFilterServiceType(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">{t.reception.allServices}</option>
                {serviceTypes.map((st) => (<option key={st.id} value={st.id}>{st.icon} {st.name}</option>))}
              </select>
              <select value={filterPaymentMethod} onChange={(e) => { setFilterPaymentMethod(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">{t.reception.allPayments}</option>
                {paymentMethods.map((pm) => (<option key={pm.id} value={pm.id}>{pm.icon} {pm.name}</option>))}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={showBranchColumn ? 9 : 8} className="px-4 py-12 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto" />
                </td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={showBranchColumn ? 9 : 8} className="px-4 py-12 text-center text-gray-500">{t.reception.noTransactionsFound}</td></tr>
              ) : (
                transactions.map((txn) => {
                  const relativeTime = txn.createdAt ? getRelativeTime(txn.createdAt) : null;
                  const isRecent = relativeTime && !relativeTime.includes('d ago') && relativeTime !== 'Yesterday';

                  return (
                    <tr key={txn.id} className={`${txn.isVoided ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'} ${isRecent ? 'bg-green-50/30' : ''}`}>
                      {/* Date & Time */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {txn.transactionDate ? formatShortDate(txn.transactionDate) : '-'}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {txn.createdAt ? formatTime(txn.createdAt) : '-'}
                            {relativeTime && (
                              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isRecent ? 'bg-green-100 text-green-700' : 'text-gray-400'}`}>
                                {relativeTime}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      {/* Transaction (Customer + Number) */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{txn.customerName}</span>
                          <span className="text-xs text-gray-400 font-mono">{txn.transactionNumber || '-'}</span>
                        </div>
                      </td>
                      {/* Service */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md text-sm">
                          <span>{txn.serviceType?.icon}</span>
                          <span className="text-gray-700">{txn.serviceType?.name}</span>
                        </span>
                      </td>
                      {/* Payment */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm">
                          <span>{txn.paymentMethod?.icon}</span>
                          <span>{txn.paymentMethod?.name}</span>
                        </span>
                      </td>
                      {/* Branch */}
                      {showBranchColumn && (
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                            <Building2 className="w-3 h-3" />
                            {txn.branchName || '-'}
                          </span>
                        </td>
                      )}
                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-green-600 text-lg">{formatCurrency(txn.amount)}</span>
                      </td>
                      {/* Agent (Recorded By) */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          <User className="w-3.5 h-3.5" />
                          {txn.agentName || '-'}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {txn.isVoided ? <Badge variant="danger">{t.reception.voided}</Badge> : <Badge variant="success">{t.reception.active}</Badge>}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => { setSelectedTransaction(txn); setShowViewModal(true); }}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!txn.isVoided && (
                            <button
                              onClick={() => { setSelectedTransaction(txn); setShowVoidModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Void transaction"
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
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {totalCount > 0 ? (
              <>Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} transactions</>
            ) : (
              'No transactions'
            )}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{page} / {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setFormData(initialFormData); setFormErrors({}); setSelectedClient(null); }} title={t.reception.newTransaction} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.submit && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formErrors.submit}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.reception.customerClient} *</label>
              <ClientAutocomplete
                value={selectedClient}
                onChange={(client) => {
                  setSelectedClient(client);
                  if (client) {
                    setFormData({ ...formData, customerName: client.name });
                  }
                }}
                onCreateNew={(searchTerm) => {
                  setCreateClientInitialName(searchTerm);
                  setShowCreateClientModal(true);
                }}
                branchId={selectedBranchId || undefined}
                placeholder={t.reception.searchOrCreateClient}
                error={formErrors.customerName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.reception.serviceType} *</label>
              <select value={formData.serviceTypeId} onChange={(e) => setFormData({ ...formData, serviceTypeId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.serviceTypeId ? 'border-red-300' : 'border-gray-200'}`} required>
                <option value="">{t.reception.selectService}</option>
                {serviceTypes.map((st) => (<option key={st.id} value={st.id}>{st.icon} {st.name}</option>))}
              </select>
              {formErrors.serviceTypeId && <p className="mt-1 text-sm text-red-600">{formErrors.serviceTypeId}</p>}
            </div>
            <Input label="Amount (UZS)" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0" min="0" step="1000" error={formErrors.amount} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.reception.paymentMethod} *</label>
              <select value={formData.paymentMethodId} onChange={(e) => setFormData({ ...formData, paymentMethodId: e.target.value, transactionCode: '' })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.paymentMethodId ? 'border-red-300' : 'border-gray-200'}`} required>
                <option value="">{t.reception.selectPayment}</option>
                {paymentMethods.map((pm) => (<option key={pm.id} value={pm.id}>{pm.icon} {pm.name}</option>))}
              </select>
              {formErrors.paymentMethodId && <p className="mt-1 text-sm text-red-600">{formErrors.paymentMethodId}</p>}
            </div>
            <Input label="Date" type="date" value={formData.transactionDate} onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })} error={formErrors.transactionDate} required />
            {requiresTransactionCode && (
              <div className="md:col-span-2">
                <Input label="Transaction Code" value={formData.transactionCode} onChange={(e) => setFormData({ ...formData, transactionCode: e.target.value })} placeholder="Enter code" error={formErrors.transactionCode} required />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes" rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setShowAddModal(false); setFormData(initialFormData); setFormErrors({}); setSelectedClient(null); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedTransaction(null); }} title={t.reception.transactionDetails} size="lg">
        {selectedTransaction && (
          <div className="space-y-4">
            {/* Header with Amount */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-semibold text-gray-600">{selectedTransaction.transactionNumber}</span>
                {selectedTransaction.isVoided ? <Badge variant="danger">Voided</Badge> : <Badge variant="success">Active</Badge>}
              </div>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(selectedTransaction.amount)}</p>
            </div>

            {/* Customer */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Customer</p>
              <p className="font-medium text-lg">{selectedTransaction.customerName}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {selectedTransaction.transactionDate ? formatDisplayDate(selectedTransaction.transactionDate) : '-'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time Created</p>
                <p className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {selectedTransaction.createdAt ? formatTime(selectedTransaction.createdAt) : '-'}
                  {selectedTransaction.createdAt && getRelativeTime(selectedTransaction.createdAt) && (
                    <span className="text-xs text-gray-400">({getRelativeTime(selectedTransaction.createdAt)})</span>
                  )}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Service</p>
                <p className="font-medium">{selectedTransaction.serviceType?.icon} {selectedTransaction.serviceType?.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment Method</p>
                <p className="font-medium">{selectedTransaction.paymentMethod?.icon} {selectedTransaction.paymentMethod?.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Recorded By</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {selectedTransaction.agentName || '-'}
                </p>
              </div>
              {selectedTransaction.branchName && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Branch</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {selectedTransaction.branchName}
                  </p>
                </div>
              )}
            </div>

            {/* Transaction Code */}
            {selectedTransaction.transactionCode && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 mb-1">Transaction Code</p>
                <p className="font-mono font-medium text-blue-800">{selectedTransaction.transactionCode}</p>
              </div>
            )}

            {/* Notes */}
            {selectedTransaction.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-700">{selectedTransaction.notes}</p>
              </div>
            )}

            {/* Voided Info */}
            {selectedTransaction.isVoided && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <Ban className="w-4 h-4" />
                  Transaction Voided
                </p>
                <p className="text-sm text-red-600 mt-1">Reason: {selectedTransaction.voidReason || 'N/A'}</p>
                {selectedTransaction.voidedAt && (
                  <p className="text-xs text-red-500 mt-1">Voided at: {formatDisplayDate(selectedTransaction.voidedAt)} {formatTime(selectedTransaction.voidedAt)}</p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => { setShowViewModal(false); setSelectedTransaction(null); }}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showVoidModal} onClose={() => { setShowVoidModal(false); setSelectedTransaction(null); setVoidReason(''); }} title={t.reception.voidTransaction} size="md">
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">Void <strong>{selectedTransaction.transactionNumber}</strong> for <strong>{formatCurrency(selectedTransaction.amount)}</strong>?</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Enter reason" rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => { setShowVoidModal(false); setSelectedTransaction(null); setVoidReason(''); }}>Cancel</Button>
              <Button variant="danger" onClick={handleVoid} disabled={isSubmitting || !voidReason.trim()}>{isSubmitting ? 'Voiding...' : 'Void'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => {
          setShowCreateClientModal(false);
          setCreateClientInitialName('');
        }}
        onCreated={(newClient) => {
          setSelectedClient(newClient);
          setFormData({ ...formData, customerName: newClient.name });
          setShowCreateClientModal(false);
          setCreateClientInitialName('');
        }}
        branchId={selectedBranchId || undefined}
        initialName={createClientInitialName}
      />
    </div>
  );
}
