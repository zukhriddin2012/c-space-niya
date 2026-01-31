'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Package, CreditCard, Layers, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';

// ============================================
// ADMIN CONFIGURATION PAGE
// ============================================

interface ConfigItem {
  id: string;
  name: string;
  code: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  requiresCode?: boolean; // Only for payment methods
}

type ConfigType = 'service-types' | 'expense-types' | 'payment-methods';

const tabs = [
  { id: 'service-types', label: 'Service Types', icon: <Layers size={18} /> },
  { id: 'expense-types', label: 'Expense Types', icon: <Package size={18} /> },
  { id: 'payment-methods', label: 'Payment Methods', icon: <CreditCard size={18} /> },
];

// Common emojis for quick selection
const commonEmojis = ['📦', '💵', '📱', '💳', '🏦', '👥', '🪑', '🗓️', '🎤', '🏢', '🖥️', '🔄', '📅', '📆', '🎓', '🛒', '⚡', '👷', '🧾', '🔧', '📢', '🏗️', '❤️', '🍇', '🖱️'];

export default function ReceptionAdminPage() {
  const [activeTab, setActiveTab] = useState<ConfigType>('service-types');
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

  // Fetch items
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/reception/admin/${activeTab}${showInactive ? '' : '?activeOnly=true'}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }

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

  // Filter items by search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open modal for new item
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      icon: '',
      description: '',
      requiresCode: false,
    });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  // Open modal for editing
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

  // Handle form submission
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

      if (activeTab === 'payment-methods') {
        body.requiresCode = formData.requiresCode;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          setFormErrors(data.details);
        } else {
          setFormErrors([data.error || 'Failed to save']);
        }
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

  // Toggle active status
  const handleToggleActive = async (item: ConfigItem) => {
    try {
      const response = await fetch(`/api/reception/admin/${activeTab}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      fetchItems();
    } catch {
      setError('Failed to update status');
    }
  };

  // Handle delete/deactivate
  const handleDelete = async (item: ConfigItem) => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/reception/admin/${activeTab}/${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      setDeleteConfirm(null);
      fetchItems();
    } catch {
      setError('Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get title based on active tab
  const getTitle = () => {
    switch (activeTab) {
      case 'service-types':
        return 'Service Types';
      case 'expense-types':
        return 'Expense Types';
      case 'payment-methods':
        return 'Payment Methods';
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Settings className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reception Admin</h1>
            <p className="text-gray-500 text-sm">Configure service types, expense categories, and payment methods</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as ConfigType)}
        className="mb-6"
      />

      {/* Content */}
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

        {/* Error message */}
        {error && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Loading state */}
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
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Icon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  {activeTab === 'payment-methods' && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Requires Code
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 transition-colors ${!item.isActive ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-2xl">{item.icon || '📦'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">{item.code}</code>
                    </td>
                    {activeTab === 'payment-methods' && (
                      <td className="px-4 py-3">
                        {item.requiresCode ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            No
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          item.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item.isActive ? (
                          <>
                            <ToggleRight size={14} />
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={14} />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate"
                        >
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
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <ul className="list-disc list-inside">
                {formErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Meeting Room"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., meeting_room"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Unique identifier. Will be converted to lowercase with underscores.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Icon
            </label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {commonEmojis.slice(0, 12).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`p-2 text-xl rounded-lg border transition-colors ${
                    formData.icon === emoji
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Input
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="Enter emoji or leave empty"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
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
                <span className="text-sm font-medium text-gray-700">
                  Requires transaction code
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500 ml-6">
                Enable this for payment methods like Payme, Click, or Uzum that require a transaction code.
              </p>
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
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to deactivate <strong>{deleteConfirm?.name}</strong>?
        </p>
        <p className="mt-2 text-sm text-gray-500">
          This item will be hidden from selection but can be reactivated later.
        </p>
      </Modal>
    </div>
  );
}
