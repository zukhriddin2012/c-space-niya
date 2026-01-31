'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, X, Eye, Ban, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/modules/reception/lib/constants';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';
import type { Transaction, ServiceType, PaymentMethodConfig, CreateTransactionInput } from '@/modules/reception/types';

interface TransactionFormData {
  customerName: string;
  serviceTypeId: string;
  amount: string;
  paymentMethodId: string;
  transactionCode: string;
  notes: string;
  transactionDate: string;
}

const initialFormData: TransactionFormData = {
  customerName: '',
  serviceTypeId: '',
  amount: '',
  paymentMethodId: '',
  transactionCode: '',
  notes: '',
  transactionDate: new Date().toISOString().split('T')[0],
};

export default function ReceptionTransactions() {
  const { selectedBranchId } = useReceptionMode();
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
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showBranchColumn, setShowBranchColumn] = useState(false);
  const pageSize = 15;

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

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (selectedBranchId) params.append('branchId', selectedBranchId);
      if (searchQuery) params.append('search', searchQuery);
      if (filterServiceType) params.append('serviceTypeId', filterServiceType);
      if (filterPaymentMethod) params.append('paymentMethodId', filterPaymentMethod);
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);

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
  }, [page, selectedBranchId, searchQuery, filterServiceType, filterPaymentMethod, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.customerName.trim()) errors.customerName = 'Customer name is required';
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
        customerName: formData.customerName.trim(),
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

  const clearFilters = () => {
    setSearchQuery('');
    setFilterServiceType('');
    setFilterPaymentMethod('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || filterServiceType || filterPaymentMethod || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500">Record and manage sales</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Transaction
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name..."
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
              <select value={filterServiceType} onChange={(e) => { setFilterServiceType(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Services</option>
                {serviceTypes.map((st) => (<option key={st.id} value={st.id}>{st.icon} {st.name}</option>))}
              </select>
              <select value={filterPaymentMethod} onChange={(e) => { setFilterPaymentMethod(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Payments</option>
                {paymentMethods.map((pm) => (<option key={pm.id} value={pm.id}>{pm.icon} {pm.name}</option>))}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
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
              ) : transactions.length === 0 ? (
                <tr><td colSpan={showBranchColumn ? 7 : 6} className="px-4 py-12 text-center text-gray-500">No transactions</td></tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className={t.isVoided ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.customerName}</td>
                    <td className="px-4 py-3"><span>{t.serviceType?.icon}</span> {t.serviceType?.name}</td>
                    <td className="px-4 py-3"><span>{t.paymentMethod?.icon}</span> {t.paymentMethod?.name}</td>
                    {showBranchColumn && (
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <Building2 className="w-3 h-3" />
                          {t.branchName || '-'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3">{t.isVoided ? <Badge variant="danger">Voided</Badge> : <Badge variant="success">Active</Badge>}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setSelectedTransaction(t); setShowViewModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                      {!t.isVoided && (
                        <button onClick={() => { setSelectedTransaction(t); setShowVoidModal(true); }}
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
            <p className="text-sm text-gray-500">{totalCount} transactions</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm">{page}/{totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setFormData(initialFormData); setFormErrors({}); }} title="New Transaction" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.submit && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formErrors.submit}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input label="Customer Name" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} placeholder="Enter customer name" error={formErrors.customerName} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
              <select value={formData.serviceTypeId} onChange={(e) => setFormData({ ...formData, serviceTypeId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.serviceTypeId ? 'border-red-300' : 'border-gray-200'}`} required>
                <option value="">Select service</option>
                {serviceTypes.map((st) => (<option key={st.id} value={st.id}>{st.icon} {st.name}</option>))}
              </select>
              {formErrors.serviceTypeId && <p className="mt-1 text-sm text-red-600">{formErrors.serviceTypeId}</p>}
            </div>
            <Input label="Amount (UZS)" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0" min="0" step="1000" error={formErrors.amount} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select value={formData.paymentMethodId} onChange={(e) => setFormData({ ...formData, paymentMethodId: e.target.value, transactionCode: '' })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.paymentMethodId ? 'border-red-300' : 'border-gray-200'}`} required>
                <option value="">Select payment</option>
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
            <Button type="button" variant="secondary" onClick={() => { setShowAddModal(false); setFormData(initialFormData); setFormErrors({}); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedTransaction(null); }} title="Transaction Details" size="lg">
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-semibold">{selectedTransaction.transactionNumber}</span>
                {selectedTransaction.isVoided ? <Badge variant="danger">Voided</Badge> : <Badge variant="success">Active</Badge>}
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedTransaction.amount)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Customer</p><p className="font-medium">{selectedTransaction.customerName}</p></div>
              <div><p className="text-sm text-gray-500">Date</p><p className="font-medium">{selectedTransaction.transactionDate}</p></div>
              <div><p className="text-sm text-gray-500">Service</p><p className="font-medium">{selectedTransaction.serviceType?.icon} {selectedTransaction.serviceType?.name}</p></div>
              <div><p className="text-sm text-gray-500">Payment</p><p className="font-medium">{selectedTransaction.paymentMethod?.icon} {selectedTransaction.paymentMethod?.name}</p></div>
              {selectedTransaction.transactionCode && <div className="col-span-2"><p className="text-sm text-gray-500">Code</p><p className="font-mono">{selectedTransaction.transactionCode}</p></div>}
              {selectedTransaction.notes && <div className="col-span-2"><p className="text-sm text-gray-500">Notes</p><p>{selectedTransaction.notes}</p></div>}
            </div>
            {selectedTransaction.isVoided && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-sm font-medium text-red-800">Voided</p><p className="text-sm text-red-600">Reason: {selectedTransaction.voidReason || 'N/A'}</p></div>}
            <div className="flex justify-end pt-4 border-t"><Button variant="secondary" onClick={() => { setShowViewModal(false); setSelectedTransaction(null); }}>Close</Button></div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showVoidModal} onClose={() => { setShowVoidModal(false); setSelectedTransaction(null); setVoidReason(''); }} title="Void Transaction" size="md">
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
    </div>
  );
}
