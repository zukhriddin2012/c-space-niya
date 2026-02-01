'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, X, Eye, Ban, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { formatCurrency, EXPENSE_PAYMENT_METHODS_LIST } from '@/modules/reception/lib/constants';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type { Expense, ExpenseType, CreateExpenseInput } from '@/modules/reception/types';

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

export default function ReceptionExpenses() {
  const { selectedBranchId } = useReceptionMode();
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpenseType, setFilterExpenseType] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showBranchColumn, setShowBranchColumn] = useState(false);
  const pageSize = 15;

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

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (selectedBranchId) params.append('branchId', selectedBranchId);
      if (searchQuery) params.append('search', searchQuery);
      if (filterExpenseType) params.append('expenseTypeId', filterExpenseType);
      if (filterPaymentMethod) params.append('paymentMethod', filterPaymentMethod);
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);

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
  }, [page, selectedBranchId, searchQuery, filterExpenseType, filterPaymentMethod, filterDateFrom, filterDateTo]);

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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

  const clearFilters = () => {
    setSearchQuery('');
    setFilterExpenseType('');
    setFilterPaymentMethod('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || filterExpenseType || filterPaymentMethod || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reception.expenses')}</h1>
          <p className="text-gray-500">{t('reception.recordExpenses')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('reception.newExpense')}
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('reception.searchExpenses')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <Button variant={showFilters ? 'primary' : 'secondary'} onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && <span className="ml-2 w-2 h-2 bg-purple-500 rounded-full" />}
          </Button>
        </div>

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
              <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" />Clear</Button>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                {showBranchColumn && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={showBranchColumn ? 7 : 6} className="px-4 py-12 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto" />
                </td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={showBranchColumn ? 7 : 6} className="px-4 py-12 text-center text-gray-500">No expenses</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className={e.isVoided ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{e.subject}</td>
                    <td className="px-4 py-3"><span>{e.expenseType?.icon}</span> {e.expenseType?.name}</td>
                    <td className="px-4 py-3"><span>{e.paymentMethod === 'cash' ? '💵' : '🏦'}</span> {e.paymentMethod}</td>
                    {showBranchColumn && (
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <Building2 className="w-3 h-3" />
                          {e.branchName || '-'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3">{e.isVoided ? <Badge variant="danger">Voided</Badge> : <Badge variant="success">Active</Badge>}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setSelectedExpense(e); setShowViewModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                      {!e.isVoided && (
                        <button onClick={() => { setSelectedExpense(e); setShowVoidModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded ml-1"><Ban className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))
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

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setFormData(initialFormData); setFormErrors({}); }} title="New Expense" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.submit && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formErrors.submit}</div>}
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
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-semibold">{selectedExpense.expenseNumber}</span>
                {selectedExpense.isVoided ? <Badge variant="danger">Voided</Badge> : <Badge variant="success">Active</Badge>}
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedExpense.amount)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><p className="text-sm text-gray-500">Subject</p><p className="font-medium">{selectedExpense.subject}</p></div>
              <div><p className="text-sm text-gray-500">Date</p><p className="font-medium">{selectedExpense.expenseDate}</p></div>
              <div><p className="text-sm text-gray-500">Type</p><p className="font-medium">{selectedExpense.expenseType?.icon} {selectedExpense.expenseType?.name}</p></div>
              <div><p className="text-sm text-gray-500">Payment</p><p className="font-medium capitalize">{selectedExpense.paymentMethod === 'cash' ? '💵' : '🏦'} {selectedExpense.paymentMethod}</p></div>
              {selectedExpense.description && <div className="col-span-2"><p className="text-sm text-gray-500">Description</p><p>{selectedExpense.description}</p></div>}
            </div>
            {selectedExpense.isVoided && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-sm font-medium text-red-800">Voided</p><p className="text-sm text-red-600">Reason: {selectedExpense.voidReason || 'N/A'}</p></div>}
            <div className="flex justify-end pt-4 border-t"><Button variant="secondary" onClick={() => { setShowViewModal(false); setSelectedExpense(null); }}>Close</Button></div>
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
