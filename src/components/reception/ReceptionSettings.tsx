'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Package, Wallet, CreditCard, Plus, Pencil, Trash2, Users, Building2, Search, X } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type { ServiceType, ExpenseType, PaymentMethodConfig, ReceptionBranchAccess } from '@/modules/reception/types';

type Tab = 'services' | 'expenses' | 'payments' | 'branch_access';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  branchName?: string;
}

export default function ReceptionSettings() {
  const { selectedBranchId, selectedBranch } = useReceptionMode();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ServiceType | ExpenseType | PaymentMethodConfig | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', icon: '📦', requiresCode: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Branch access state
  const [branchAccessList, setBranchAccessList] = useState<ReceptionBranchAccess[]>([]);
  const [isLoadingBranchAccess, setIsLoadingBranchAccess] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [grantNotes, setGrantNotes] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [canManageBranchAccess, setCanManageBranchAccess] = useState(false);

  // Fetch branch access list
  const fetchBranchAccess = useCallback(async () => {
    if (!selectedBranchId || selectedBranchId === 'all') return;
    setIsLoadingBranchAccess(true);
    try {
      const response = await fetch(`/api/reception/admin/branch-access?branchId=${selectedBranchId}`);
      if (response.ok) {
        const data = await response.json();
        setBranchAccessList(data.users || []);
        setCanManageBranchAccess(data.canManage || false);
      }
    } catch {
      console.error('Failed to fetch branch access');
    } finally {
      setIsLoadingBranchAccess(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [servicesRes, expensesRes, paymentsRes] = await Promise.all([
          fetch('/api/reception/admin/service-types'),
          fetch('/api/reception/admin/expense-types'),
          fetch('/api/reception/admin/payment-methods'),
        ]);
        if (servicesRes.ok) setServiceTypes(await servicesRes.json());
        if (expensesRes.ok) setExpenseTypes(await expensesRes.json());
        if (paymentsRes.ok) setPaymentMethods(await paymentsRes.json());
      } catch {
        console.error('Failed to fetch settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch branch access when tab changes or branch changes
  useEffect(() => {
    if (activeTab === 'branch_access') {
      fetchBranchAccess();
    }
  }, [activeTab, fetchBranchAccess]);

  // Search employees
  const searchEmployees = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`/api/employees?search=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        // Filter out employees who already have access
        const existingIds = new Set(branchAccessList.map(a => a.userId));
        setSearchResults((data.employees || []).filter((e: Employee) => !existingIds.has(e.id)));
      }
    } catch {
      console.error('Failed to search employees');
    } finally {
      setIsSearching(false);
    }
  }, [branchAccessList]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (employeeSearch) searchEmployees(employeeSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [employeeSearch, searchEmployees]);

  // Grant branch access
  const handleGrantAccess = async () => {
    if (!selectedEmployee || !selectedBranchId) return;
    setIsGranting(true);
    try {
      const response = await fetch('/api/reception/admin/branch-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedEmployee.id,
          branchId: selectedBranchId,
          notes: grantNotes.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to grant access');
      setShowGrantModal(false);
      setSelectedEmployee(null);
      setEmployeeSearch('');
      setGrantNotes('');
      fetchBranchAccess();
    } catch {
      console.error('Failed to grant access');
    } finally {
      setIsGranting(false);
    }
  };

  // Revoke branch access
  const handleRevokeAccess = async (userId: string) => {
    if (!selectedBranchId || !confirm('Are you sure you want to revoke access?')) return;
    try {
      const response = await fetch(`/api/reception/admin/branch-access/${userId}/${selectedBranchId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to revoke access');
      fetchBranchAccess();
    } catch {
      console.error('Failed to revoke access');
    }
  };

  const getEndpoint = (): string => {
    switch (activeTab) {
      case 'services': return '/api/reception/admin/service-types';
      case 'expenses': return '/api/reception/admin/expense-types';
      case 'payments': return '/api/reception/admin/payment-methods';
      default: return '/api/reception/admin/service-types';
    }
  };

  const getCurrentItems = (): (ServiceType | ExpenseType | PaymentMethodConfig)[] => {
    switch (activeTab) {
      case 'services': return serviceTypes;
      case 'expenses': return expenseTypes;
      case 'payments': return paymentMethods;
      default: return [];
    }
  };

  const refreshData = async () => {
    const response = await fetch(getEndpoint());
    if (response.ok) {
      const data = await response.json();
      switch (activeTab) {
        case 'services': setServiceTypes(data); break;
        case 'expenses': setExpenseTypes(data); break;
        case 'payments': setPaymentMethods(data); break;
      }
    }
  };

  const handleAdd = () => {
    setEditItem(null);
    setFormData({ name: '', code: '', icon: '📦', requiresCode: false });
    setShowModal(true);
  };

  const handleEdit = (item: ServiceType | ExpenseType | PaymentMethodConfig) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      icon: item.icon || '📦',
      requiresCode: 'requiresCode' in item ? item.requiresCode : false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = editItem ? `${getEndpoint()}/${editItem.id}` : getEndpoint();
      const method = editItem ? 'PATCH' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to save');
      setShowModal(false);
      refreshData();
    } catch {
      console.error('Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: ServiceType | ExpenseType | PaymentMethodConfig) => {
    try {
      await fetch(`${getEndpoint()}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      refreshData();
    } catch {
      console.error('Failed to toggle');
    }
  };

  const tabs = [
    { id: 'services' as const, label: t('reception.serviceTypes'), icon: Package },
    { id: 'expenses' as const, label: t('reception.expenseTypes'), icon: Wallet },
    { id: 'payments' as const, label: t('reception.paymentMethods'), icon: CreditCard },
    ...(selectedBranchId && selectedBranchId !== 'all' ? [{ id: 'branch_access' as const, label: t('reception.branchAccess'), icon: Users }] : []),
  ];

  const emojiList = ['📦', '👥', '🪑', '🗓️', '🎤', '🏢', '🖥️', '🔄', '📅', '📆', '🎓', '🛒', '⚡', '👷', '🧾', '🔧', '📢', '🏗️', '❤️', '💵', '📱', '🖱️', '🍇', '💳', '🏦'];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-600" />
          {t('reception.settings')}
        </h1>
        <p className="text-gray-500">{t('reception.manageSettings')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content - Config Types */}
      {activeTab !== 'branch_access' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">
              {activeTab === 'services' && 'Service Types'}
              {activeTab === 'expenses' && 'Expense Types'}
              {activeTab === 'payments' && 'Payment Methods'}
            </h3>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Add New
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {getCurrentItems().map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.isActive ? 'success' : 'default'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {getCurrentItems().length === 0 && (
                <p className="text-center text-gray-500 py-8">No items yet</p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Content - Branch Access */}
      {activeTab === 'branch_access' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                Branch Access - {selectedBranch?.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage who can record transactions for this branch
              </p>
            </div>
            {canManageBranchAccess && (
              <Button size="sm" onClick={() => setShowGrantModal(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Grant Access
              </Button>
            )}
          </div>

          {isLoadingBranchAccess ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {branchAccessList.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{access.userName}</p>
                      <p className="text-xs text-gray-500">
                        Granted by {access.grantedByName} • {new Date(access.grantedAt).toLocaleDateString()}
                      </p>
                      {access.notes && (
                        <p className="text-xs text-gray-400 mt-0.5">{access.notes}</p>
                      )}
                    </div>
                  </div>
                  {canManageBranchAccess && (
                    <button
                      onClick={() => handleRevokeAccess(access.userId)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Revoke access"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {branchAccessList.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No additional branch access granted yet
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Item' : 'Add New Item'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter name"
            required
          />
          <Input
            label="Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
            placeholder="unique_code"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {emojiList.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-colors ${
                    formData.icon === emoji
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          {activeTab === 'payments' && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresCode}
                onChange={(e) => setFormData({ ...formData, requiresCode: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Requires transaction code</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Grant Branch Access Modal */}
      <Modal
        isOpen={showGrantModal}
        onClose={() => {
          setShowGrantModal(false);
          setSelectedEmployee(null);
          setEmployeeSearch('');
          setSearchResults([]);
          setGrantNotes('');
        }}
        title="Grant Branch Access"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-800">
              Grant access to <strong>{selectedBranch?.name}</strong> for an employee
            </p>
          </div>

          {!selectedEmployee ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees by name..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              {isSearching && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full" />
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {searchResults.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => setSelectedEmployee(employee)}
                      className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {employee.email} • {employee.branchName || 'No branch'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!isSearching && employeeSearch.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-gray-500 py-4">No employees found</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{selectedEmployee.email}</p>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                  placeholder="e.g., Covers for Labzak on Mondays"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowGrantModal(false);
                    setSelectedEmployee(null);
                    setEmployeeSearch('');
                    setGrantNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleGrantAccess} disabled={isGranting}>
                  {isGranting ? 'Granting...' : 'Grant Access'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
