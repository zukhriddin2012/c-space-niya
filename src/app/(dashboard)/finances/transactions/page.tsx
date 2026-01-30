'use client';

import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  ChevronDown,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  MoreHorizontal,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface Transaction {
  id: string;
  branch_id: string;
  branch_name?: string;
  transaction_type: 'revenue' | 'expense';
  transaction_date: string;
  amount: number;
  service_type?: string;
  customer_name?: string;
  expense_category?: string;
  vendor_name?: string;
  payment_method?: string;
  notes?: string;
  approval_status: 'approved' | 'pending' | 'rejected';
  isNew?: boolean;
  isDirty?: boolean;
}

interface Branch {
  id: string;
  name: string;
}

// Service types and expense categories
const SERVICE_TYPES = ['Office', 'Dedicated', 'Flex', 'Meeting', 'Conference', 'Hour', 'Day Pass', 'Other'];
const EXPENSE_CATEGORIES = ['Goods', 'Utility', 'Maintenance', 'Staff', 'Marketing', 'Tax', 'CapEx', 'Other'];
const PAYMENT_METHODS = ['cash', 'terminal', 'payme', 'click', 'uzum', 'bank'];

// Payment method icons
const PaymentIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'cash':
      return <Banknote className="w-3.5 h-3.5" />;
    case 'terminal':
      return <CreditCard className="w-3.5 h-3.5" />;
    case 'payme':
    case 'click':
    case 'uzum':
      return <Smartphone className="w-3.5 h-3.5" />;
    case 'bank':
      return <Building2 className="w-3.5 h-3.5" />;
    default:
      return <CreditCard className="w-3.5 h-3.5" />;
  }
};

// Format currency
function formatCurrency(amount: number): string {
  return amount.toLocaleString('uz-UZ');
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch('/api/branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(data.branches || []);
          if (data.branches?.length > 0) {
            setSelectedBranch(data.branches[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };
    fetchBranches();
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!selectedBranch) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        branchId: selectedBranch,
        startDate: dateFrom,
        endDate: dateTo,
        limit: '500',
      });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/finances/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const branchName = branches.find((b) => b.id === selectedBranch)?.name || '';
        const txns = (data.transactions || []).map((t: Transaction) => ({
          ...t,
          branch_name: branchName,
          isDirty: false,
        }));
        setTransactions(txns);
        setTotalCount(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, dateFrom, dateTo, typeFilter, searchQuery, branches]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Add new row
  const addNewRow = () => {
    const newTxn: Transaction = {
      id: `new-${Date.now()}`,
      branch_id: selectedBranch,
      branch_name: branches.find((b) => b.id === selectedBranch)?.name || '',
      transaction_type: 'revenue',
      transaction_date: new Date().toISOString().split('T')[0],
      amount: 0,
      service_type: '',
      customer_name: '',
      payment_method: 'cash',
      notes: '',
      approval_status: 'approved',
      isNew: true,
      isDirty: true,
    };
    setTransactions([newTxn, ...transactions]);
    setEditingId(newTxn.id);
    setHasChanges(true);
  };

  // Update transaction field
  const updateTransaction = (id: string, field: keyof Transaction, value: string | number) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, [field]: value, isDirty: true };
          if (field === 'transaction_type') {
            if (value === 'revenue') {
              updated.expense_category = undefined;
              updated.vendor_name = undefined;
            } else {
              updated.service_type = undefined;
              updated.customer_name = undefined;
            }
          }
          return updated;
        }
        return t;
      })
    );
    setHasChanges(true);
  };

  // Delete transaction
  const deleteTransaction = (id: string) => {
    const txn = transactions.find((t) => t.id === id);
    if (txn?.isNew) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setHasChanges(true);
    }
    if (editingId === id) setEditingId(null);
  };

  // Save all changes
  const saveChanges = async () => {
    setSaving(true);
    try {
      const dirtyTxns = transactions.filter((t) => t.isDirty);

      for (const txn of dirtyTxns) {
        const payload = {
          branch_id: txn.branch_id,
          transaction_type: txn.transaction_type,
          transaction_date: txn.transaction_date,
          amount: Number(txn.amount),
          service_type: txn.service_type,
          customer_name: txn.customer_name,
          expense_category: txn.expense_category,
          vendor_name: txn.vendor_name,
          payment_method: txn.payment_method,
          notes: txn.notes,
        };

        if (txn.isNew) {
          await fetch('/api/finances/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      }

      await fetchTransactions();
      setHasChanges(false);
      setEditingId(null);
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Service/Category', 'Customer/Vendor', 'Payment', 'Amount', 'Notes'];
    const rows = transactions.map((t) => [
      t.transaction_date,
      t.transaction_type,
      t.service_type || t.expense_category || '',
      t.customer_name || t.vendor_name || '',
      t.payment_method || '',
      t.amount.toString(),
      t.notes || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${selectedBranch}-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals
  const totalRevenue = transactions.filter((t) => t.transaction_type === 'revenue').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.transaction_type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netAmount = totalRevenue - totalExpenses;

  const selectedBranchName = branches.find((b) => b.id === selectedBranch)?.name || 'Select Branch';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Back + Title + Branch Selector */}
            <div className="flex items-center gap-4">
              <Link
                href="/finances"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
                <p className="text-sm text-gray-500">{totalCount} records</p>
              </div>

              {/* Branch Selector Dropdown */}
              <div className="relative ml-4">
                <button
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">{selectedBranchName}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showBranchDropdown && (
                  <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-lg border py-2 min-w-[200px] z-30">
                    {branches.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => {
                          setSelectedBranch(branch.id);
                          setShowBranchDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                          selectedBranch === branch.id ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {branch.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {hasChanges && (
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              )}

              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              <button
                onClick={addNewRow}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-4 mt-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <button
                onClick={() => setShowTypeFilter(!showTypeFilter)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {typeFilter === 'all' ? 'All Types' : typeFilter === 'revenue' ? 'Revenue' : 'Expense'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showTypeFilter && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-lg border py-2 min-w-[150px] z-30">
                  {['all', 'revenue', 'expense'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setTypeFilter(type as typeof typeFilter);
                        setShowTypeFilter(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        typeFilter === type ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent border-0 text-sm text-gray-700 focus:ring-0 w-32"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent border-0 text-sm text-gray-700 focus:ring-0 w-32"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Revenue</span>
              <div className="p-1.5 bg-green-100 rounded-lg">
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-green-600 mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Expenses</span>
              <div className="p-1.5 bg-red-100 rounded-lg">
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Net</span>
              <div className={`p-1.5 rounded-lg ${netAmount >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                {netAmount >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
              </div>
            </div>
            <p className={`text-2xl font-semibold mt-1 ${netAmount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(netAmount)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">

                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className={`group hover:bg-purple-50/50 transition-colors ${
                        txn.isNew ? 'bg-green-50/50' : txn.isDirty ? 'bg-amber-50/50' : ''
                      }`}
                      onClick={() => setEditingId(txn.id)}
                    >
                      {/* Date */}
                      <td className="px-4 py-3">
                        {editingId === txn.id ? (
                          <input
                            type="date"
                            value={txn.transaction_date}
                            onChange={(e) => updateTransaction(txn.id, 'transaction_date', e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{formatDate(txn.transaction_date)}</span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3">
                        {editingId === txn.id ? (
                          <select
                            value={txn.transaction_type}
                            onChange={(e) => updateTransaction(txn.id, 'transaction_type', e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="revenue">Revenue</option>
                            <option value="expense">Expense</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              txn.transaction_type === 'revenue'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {txn.transaction_type === 'revenue' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {txn.transaction_type === 'revenue' ? 'Revenue' : 'Expense'}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        {editingId === txn.id ? (
                          <select
                            value={txn.transaction_type === 'revenue' ? txn.service_type || '' : txn.expense_category || ''}
                            onChange={(e) =>
                              updateTransaction(
                                txn.id,
                                txn.transaction_type === 'revenue' ? 'service_type' : 'expense_category',
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Select...</option>
                            {(txn.transaction_type === 'revenue' ? SERVICE_TYPES : EXPENSE_CATEGORIES).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-600">
                            {txn.service_type || txn.expense_category || '—'}
                          </span>
                        )}
                      </td>

                      {/* Description (Customer/Vendor) */}
                      <td className="px-4 py-3">
                        {editingId === txn.id ? (
                          <input
                            type="text"
                            value={txn.transaction_type === 'revenue' ? txn.customer_name || '' : txn.vendor_name || ''}
                            onChange={(e) =>
                              updateTransaction(
                                txn.id,
                                txn.transaction_type === 'revenue' ? 'customer_name' : 'vendor_name',
                                e.target.value
                              )
                            }
                            placeholder={txn.transaction_type === 'revenue' ? 'Customer name' : 'Vendor name'}
                            className="w-full px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {txn.customer_name || txn.vendor_name || '—'}
                          </span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3">
                        {editingId === txn.id ? (
                          <select
                            value={txn.payment_method || ''}
                            onChange={(e) => updateTransaction(txn.id, 'payment_method', e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Select...</option>
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method} value={method}>{method.charAt(0).toUpperCase() + method.slice(1)}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            <PaymentIcon method={txn.payment_method || ''} />
                            {txn.payment_method ? txn.payment_method.charAt(0).toUpperCase() + txn.payment_method.slice(1) : '—'}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        {editingId === txn.id ? (
                          <input
                            type="number"
                            value={txn.amount}
                            onChange={(e) => updateTransaction(txn.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-32 px-2 py-1 text-sm border rounded-lg text-right focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              txn.transaction_type === 'revenue' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {txn.transaction_type === 'revenue' ? '+' : '-'}
                            {formatCurrency(txn.amount)}
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3">
                        {editingId === txn.id ? (
                          <input
                            type="text"
                            value={txn.notes || ''}
                            onChange={(e) => updateTransaction(txn.id, 'notes', e.target.value)}
                            placeholder="Add note..."
                            className="w-full px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm text-gray-500 truncate block max-w-[200px]">
                            {txn.notes || '—'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTransaction(txn.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Add New Row */}
                  <tr
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={addNewRow}
                  >
                    <td colSpan={8} className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2 text-gray-400 hover:text-purple-600 transition-colors">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">Click to add new transaction</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state */}
          {transactions.length === 0 && !loading && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions yet</h3>
              <p className="text-sm text-gray-500 mb-4">Get started by adding your first transaction</p>
              <button
                onClick={addNewRow}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Transaction
              </button>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        {transactions.filter((t) => t.isDirty).length > 0 && (
          <div className="mt-4 flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                {transactions.filter((t) => t.isDirty).length} unsaved change{transactions.filter((t) => t.isDirty).length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Now
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close editing */}
      {editingId && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

// Missing import fix
function Receipt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17V7" />
    </svg>
  );
}
