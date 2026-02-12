'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  CreditCard,
  Layers,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  AlertCircle,
  KeyRound,
  Shuffle,
  Loader2,
  Check,
  Copy,
  Download,
  Building2,
  ExternalLink,
  Wallet,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TYPES
// ============================================

interface ConfigItem {
  id: string;
  name: string;
  code: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  requiresCode?: boolean;
}

interface BranchPasswordStatus {
  id: string;
  name: string;
  hasPassword: boolean;
}

interface PinAssignment {
  employeeId: string;
  employeeName: string;
  branchId: string;
  pin: string;
}

type SubTab = 'service-types' | 'expense-types' | 'payment-methods' | 'operator-pins' | 'kiosk-passwords' | 'cash-settings';

const subTabs: Array<{ id: SubTab; label: string; icon: React.ReactNode }> = [
  { id: 'service-types', label: 'Service Types', icon: <Layers size={16} /> },
  { id: 'expense-types', label: 'Expense Types', icon: <Package size={16} /> },
  { id: 'payment-methods', label: 'Payment Methods', icon: <CreditCard size={16} /> },
  { id: 'operator-pins', label: 'Operator PINs', icon: <KeyRound size={16} /> },
  { id: 'kiosk-passwords', label: 'Kiosk Passwords', icon: <Building2 size={16} /> },
  { id: 'cash-settings', label: 'Cash Settings', icon: <Wallet size={16} /> },
];

const commonEmojis = ['📦', '💵', '📱', '💳', '🏦', '👥', '🪑', '🗓️', '🎤', '🏢', '🖥️', '🔄', '📅', '📆', '🎓', '🛒', '⚡', '👷', '🧾', '🔧', '📢', '🏗️', '❤️', '🍇', '🖱️'];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ReceptionAdminSettings() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('service-types');

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSubTab === tab.id
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Config CRUD tabs */}
      {(activeSubTab === 'service-types' || activeSubTab === 'expense-types' || activeSubTab === 'payment-methods') && (
        <ConfigPanel activeTab={activeSubTab} />
      )}

      {/* Operator PINs */}
      {activeSubTab === 'operator-pins' && <OperatorPinsPanel />}

      {/* Kiosk Passwords */}
      {activeSubTab === 'kiosk-passwords' && <KioskPasswordsPanel />}

      {/* Cash Settings (PR2-066) */}
      {activeSubTab === 'cash-settings' && <CashSettingsPanel />}
    </div>
  );
}

// ============================================
// CONFIG CRUD PANEL (Service Types, Expense Types, Payment Methods)
// ============================================

function ConfigPanel({ activeTab }: { activeTab: 'service-types' | 'expense-types' | 'payment-methods' }) {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    icon: '',
    description: '',
    requiresCode: false,
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<ConfigItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/reception/admin/${activeTab}${showInactive ? '' : '?activeOnly=true'}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, showInactive]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTitle = () => {
    switch (activeTab) {
      case 'service-types': return 'Service Types';
      case 'expense-types': return 'Expense Types';
      case 'payment-methods': return 'Payment Methods';
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', code: '', icon: '', description: '', requiresCode: false });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ConfigItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      icon: item.icon || '',
      description: item.description || '',
      requiresCode: item.requiresCode || false,
    });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setIsSaving(true);
    try {
      const url = editingItem
        ? `/api/reception/admin/${activeTab}/${editingItem.id}`
        : `/api/reception/admin/${activeTab}`;
      const method = editingItem ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        name: formData.name,
        code: formData.code,
        icon: formData.icon || undefined,
        description: formData.description || undefined,
      };
      if (activeTab === 'payment-methods') body.requiresCode = formData.requiresCode;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setFormErrors(data.details && Array.isArray(data.details) ? data.details : [data.error || 'Failed to save']);
        return;
      }
      setIsModalOpen(false);
      fetchItems();
    } catch {
      setFormErrors(['Network error. Please try again.']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: ConfigItem) => {
    try {
      const response = await fetch(`/api/reception/admin/${activeTab}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchItems();
    } catch {
      setError('Failed to update status');
    }
  };

  const handleDelete = async (item: ConfigItem) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reception/admin/${activeTab}/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setDeleteConfirm(null);
      fetchItems();
    } catch {
      setError('Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={`Search ${getTitle().toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Show inactive
            </label>
            <Button onClick={handleAdd} variant="primary">
              <Plus size={18} />
              Add New
            </Button>
          </div>
        </div>

        {error && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            Loading...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? `No ${getTitle().toLowerCase()} matching "${searchQuery}"` : `No ${getTitle().toLowerCase()} found`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Icon</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  {activeTab === 'payment-methods' && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requires Code</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${!item.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3"><span className="text-2xl">{item.icon || '📦'}</span></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">{item.code}</code>
                    </td>
                    {activeTab === 'payment-methods' && (
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.requiresCode ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.requiresCode ? 'Yes' : 'No'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          item.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item.isActive ? <><ToggleRight size={14} /> Active</> : <><ToggleLeft size={14} /> Inactive</>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setDeleteConfirm(item)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deactivate">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit ${getTitle().slice(0, -1)}` : `Add ${getTitle().slice(0, -1)}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <ul className="list-disc list-inside">{formErrors.map((err, i) => <li key={i}>{err}</li>)}</ul>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Meeting Room" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
            <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., meeting_room" required />
            <p className="mt-1 text-xs text-gray-500">Unique identifier. Will be converted to lowercase with underscores.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {commonEmojis.slice(0, 12).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`p-2 text-xl rounded-lg border transition-colors ${
                    formData.icon === emoji ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >{emoji}</button>
              ))}
            </div>
            <Input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="Enter emoji or leave empty" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={3}
            />
          </div>
          {activeTab === 'payment-methods' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requiresCode}
                  onChange={(e) => setFormData({ ...formData, requiresCode: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Requires transaction code</span>
              </label>
              <p className="mt-1 text-xs text-gray-500 ml-6">Enable this for payment methods like Payme, Click, or Uzum that require a transaction code.</p>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Deactivate Item"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={isDeleting}>
              {isDeleting ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </>
        }
      >
        <p className="text-gray-600">Are you sure you want to deactivate <strong>{deleteConfirm?.name}</strong>?</p>
        <p className="mt-2 text-sm text-gray-500">This item will be hidden from selection but can be reactivated later.</p>
      </Modal>
    </>
  );
}

// ============================================
// OPERATOR PINS PANEL
// ============================================

function OperatorPinsPanel() {
  const [isAssigning, setIsAssigning] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [results, setResults] = useState<PinAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleBulkAssign = async () => {
    setShowConfirm(false);
    setIsAssigning(true);
    setError(null);
    setSuccess(null);
    setResults(null);
    try {
      const response = await fetch('/api/reception/operator-pin/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwrite }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Failed to assign PINs'); return; }
      setResults(data.assigned);
      setSuccess(data.message);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const copyPin = (employeeId: string, pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedId(employeeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllPins = () => {
    if (!results || results.length === 0) return;
    navigator.clipboard.writeText(results.map((r) => `${r.employeeName}: ${r.pin}`).join('\n'));
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadCsv = () => {
    if (!results || results.length === 0) return;
    const header = 'Employee Name,PIN,Branch ID\n';
    const rows = results.map((r) => `"${r.employeeName}",${r.pin},${r.branchId}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operator-pins-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Shuffle size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bulk Assign Operator PINs</h2>
              <p className="text-sm text-gray-500 mt-1">Generate random 6-digit PINs for employees. PINs are unique within each branch.</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Overwrite existing PINs</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {overwrite
                    ? 'All active employees will get new PINs, replacing any existing ones.'
                    : 'Only employees without a PIN will be assigned one. Existing PINs are kept.'}
                </p>
              </div>
            </label>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={isAssigning}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isAssigning ? <><Loader2 size={16} className="animate-spin" /> Assigning PINs...</> : <><Shuffle size={16} /> Assign Random PINs</>}
          </button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mt-4">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mt-4">
              <Check size={16} className="text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Generated PINs ({results.length})</h3>
                <div className="flex items-center gap-2">
                  <button onClick={copyAllPins} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                    {copiedId === 'all' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === 'all' ? 'Copied!' : 'Copy All'}
                  </button>
                  <button onClick={downloadCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                    <Download size={12} /> Download CSV
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                <p className="text-xs text-amber-800"><strong>Important:</strong> Save these PINs now. They cannot be retrieved later — only reset.</p>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">PIN</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((r) => (
                      <tr key={r.employeeId} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm text-gray-900">{r.employeeName}</td>
                        <td className="px-4 py-2.5">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono font-bold text-gray-800 tracking-widest">{r.pin}</code>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => copyPin(r.employeeId, r.pin)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg transition-colors" title="Copy PIN">
                            {copiedId === r.employeeId ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results && results.length === 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-sm text-gray-500">All employees already have PINs assigned.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Confirm Modal */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Assign Random PINs" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleBulkAssign}>Confirm</Button>
          </>
        }
      >
        <p className="text-gray-600">
          {overwrite
            ? 'This will generate new random 6-digit PINs for ALL active employees, replacing any existing PINs.'
            : "This will generate random 6-digit PINs for all active employees who don't have one yet."}
        </p>
        <p className="mt-2 text-sm text-gray-500">PINs are guaranteed unique within each branch. You&apos;ll see the generated PINs in a table to copy or download.</p>
      </Modal>
    </>
  );
}

// ============================================
// KIOSK PASSWORDS PANEL
// ============================================

// ============================================
// CASH SETTINGS PANEL (PR2-066)
// ============================================

interface CashSettingsData {
  branchId: string;
  opexPercentage: number;
  marketingPercentage: number;
  transferThreshold: number;
}

function CashSettingsPanel() {
  const { user, isRole, isAnyRole } = useAuth();
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [settings, setSettings] = useState<CashSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [marketingPct, setMarketingPct] = useState<string>('2.5');
  const [threshold, setThreshold] = useState<string>('5000000');

  const canManage = isAnyRole(['general_manager', 'ceo']);

  // Fetch branches
  useEffect(() => {
    async function fetchBranches() {
      try {
        const response = await fetch('/api/branches');
        if (response.ok) {
          const data = await response.json();
          const list = (data.branches || data || []).map((b: Record<string, unknown>) => ({
            id: b.id as string,
            name: b.name as string,
          }));
          if (isRole('branch_manager') && user?.branchId) {
            setBranches(list.filter((b: { id: string }) => b.id === user.branchId));
          } else {
            setBranches(list);
          }
          // Auto-select first or user's branch
          const defaultBranch = user?.branchId || (list.length > 0 ? list[0].id : '');
          if (defaultBranch) setSelectedBranch(defaultBranch);
        }
      } catch {
        setError('Failed to load branches');
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, [user, isRole]);

  // Fetch cash settings when branch changes
  useEffect(() => {
    if (!selectedBranch) return;
    setError(null);
    setSuccess(null);
    async function fetchSettings() {
      try {
        const response = await fetch(`/api/reception/cash-management/settings?branchId=${selectedBranch}`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          setMarketingPct(String(data.marketingPercentage));
          setThreshold(String(data.transferThreshold));
        }
      } catch {
        setError('Failed to load cash settings');
      }
    }
    fetchSettings();
  }, [selectedBranch]);

  const handleSave = async () => {
    if (!selectedBranch) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/reception/cash-management/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranch,
          marketingPercentage: parseFloat(marketingPct),
          transferThreshold: parseFloat(threshold),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setSuccess('Cash settings saved successfully');
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <Wallet size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Only General Managers and CEOs can manage cash settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 size={24} className="animate-spin mx-auto text-purple-500 mb-2" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Branch selector */}
      {branches.length > 1 && (
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
          <Check size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {settings && (
        <Card>
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Wallet size={24} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cash Allocation Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Configure how non-inkasso cash revenue is split between OpEx, Marketing, and Dividend.</p>
              </div>
            </div>

            {/* OpEx (fixed - read-only) */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">OpEx Percentage</p>
                  <p className="text-xs text-gray-500 mt-0.5">Fixed at {settings.opexPercentage}% — covers operational expenses</p>
                </div>
                <span className="text-lg font-bold text-gray-600">{settings.opexPercentage}%</span>
              </div>
            </div>

            {/* Marketing Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marketing / Charity Percentage</label>
              <div className="flex gap-3">
                {['2.5', '5.0'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setMarketingPct(val)}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 text-center font-medium transition-colors ${
                      marketingPct === val
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Dividend gets the remaining {(100 - settings.opexPercentage - parseFloat(marketingPct)).toFixed(1)}%</p>
            </div>

            {/* Transfer Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Threshold (UZS)</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="0"
                step="500000"
              />
              <p className="text-xs text-gray-500 mt-2">When non-inkasso cash exceeds this amount, a transfer alert is shown.</p>
            </div>

            {/* Allocation Preview */}
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">Allocation Preview (per 1,000,000 UZS)</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-blue-700">{((settings.opexPercentage / 100) * 1000000).toLocaleString()}</p>
                  <p className="text-xs text-blue-600">OpEx ({settings.opexPercentage}%)</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-700">{((parseFloat(marketingPct) / 100) * 1000000).toLocaleString()}</p>
                  <p className="text-xs text-blue-600">Marketing ({marketingPct}%)</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-700">{(((100 - settings.opexPercentage - parseFloat(marketingPct)) / 100) * 1000000).toLocaleString()}</p>
                  <p className="text-xs text-blue-600">Dividend ({(100 - settings.opexPercentage - parseFloat(marketingPct)).toFixed(1)}%)</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================
// KIOSK PASSWORDS PANEL
// ============================================

function KioskPasswordsPanel() {
  const { user, isRole, isAnyRole } = useAuth();
  const [branches, setBranches] = useState<BranchPasswordStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManage = isAnyRole(['general_manager', 'ceo', 'branch_manager']);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const response = await fetch('/api/branches');
        if (response.ok) {
          const data = await response.json();
          const branchList = (data.branches || data || []).map((b: Record<string, unknown>) => ({
            id: b.id as string,
            name: b.name as string,
            hasPassword: !!b.reception_password_hash,
          }));
          if (isRole('branch_manager') && user?.branchId) {
            setBranches(branchList.filter((b: BranchPasswordStatus) => b.id === user.branchId));
          } else {
            setBranches(branchList);
          }
        }
      } catch {
        setError('Failed to load branches');
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, [user, isRole]);

  const handleSetPassword = async () => {
    if (!selectedBranch) return;
    setError(null);
    setSuccess(null);

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/reception/kiosk/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: selectedBranch, password: newPassword }),
      });
      if (response.ok) {
        setBranches(prev => prev.map(b => b.id === selectedBranch ? { ...b, hasPassword: true } : b));
        setNewPassword('');
        setConfirmPassword('');
        setSuccess('Kiosk password has been set successfully');
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const data = await response.json();
        setError(data.error === 'can_only_manage_own_branch' ? 'You can only manage your own branch' : data.error || 'Failed to set password');
      }
    } catch {
      setError('Failed to set password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePassword = async (branchId: string) => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/reception/kiosk/admin/password?branchId=${branchId}`, { method: 'DELETE' });
      if (response.ok) {
        setBranches(prev => prev.map(b => b.id === branchId ? { ...b, hasPassword: false } : b));
        setSuccess('Kiosk password removed. Kiosk access is now disabled for this branch.');
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove password');
      }
    } catch {
      setError('Failed to remove password');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <KeyRound size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">You don&apos;t have permission to manage kiosk passwords.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kiosk Link Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ExternalLink size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-purple-900">Standalone Kiosk URL</p>
            <p className="text-sm text-purple-700 mt-1">
              Open <code className="bg-purple-100 px-2 py-0.5 rounded text-purple-800 font-mono">/kiosk</code> on
              the reception computer or tablet. Staff will enter the branch password to access reception mode without
              needing an individual account.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
          <Check size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <Loader2 size={24} className="animate-spin mx-auto text-purple-500 mb-2" />
          <p className="text-sm text-gray-500">Loading branches...</p>
        </div>
      ) : (
        <>
          {/* Branch List */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            {branches.map((branch) => (
              <div key={branch.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${branch.hasPassword ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Building2 size={20} className={branch.hasPassword ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{branch.name}</p>
                    <p className={`text-xs ${branch.hasPassword ? 'text-green-600' : 'text-gray-400'}`}>
                      {branch.hasPassword ? 'Kiosk enabled' : 'No password set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedBranch(branch.id); setNewPassword(''); setConfirmPassword(''); setError(null); }}
                    className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                  >
                    {branch.hasPassword ? 'Change' : 'Set Password'}
                  </button>
                  {branch.hasPassword && (
                    <button
                      onClick={() => handleRemovePassword(branch.id)}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Remove password and disable kiosk"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Set/Change Password Form */}
          {selectedBranch && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {branches.find(b => b.id === selectedBranch)?.hasPassword ? 'Change' : 'Set'} Password
                <span className="text-purple-600 ml-2">— {branches.find(b => b.id === selectedBranch)?.name}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    placeholder="Repeat password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSetPassword}
                  disabled={saving || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  {saving ? 'Saving...' : 'Save Password'}
                </button>
                <button
                  onClick={() => { setSelectedBranch(null); setError(null); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
