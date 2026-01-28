'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight,
  DollarSign,
  X,
  Loader2,
  AlertCircle,
  Crown,
  TrendingUp,
  HeartHandshake,
  Settings,
  Sparkles,
  UserCircle,
  LayoutGrid,
  List,
  Layers
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import Link from 'next/link';

interface Employee {
  id: string;
  full_name: string;
  position: string;
}

type FaceCategory = 'executive' | 'growth' | 'support' | 'operations' | 'specialized';

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  category: FaceCategory;
  accountable_person_id: string | null;
  accountable_person?: Employee;
  display_order: number;
  manager_id: string | null;
  manager?: Employee;
  employee_count: number;
  total_budget: number;
}

const COLORS = [
  // Executive
  { name: 'Slate Dark', value: 'bg-slate-800' },
  { name: 'Slate', value: 'bg-slate-700' },
  // Growth
  { name: 'Blue', value: 'bg-blue-600' },
  { name: 'Yellow', value: 'bg-yellow-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  // Finance/Support
  { name: 'Green', value: 'bg-green-600' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  // Operations
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  // Specialized
  { name: 'Violet', value: 'bg-violet-500' },
  { name: 'Amber', value: 'bg-amber-600' },
  { name: 'Emerald', value: 'bg-emerald-600' },
];

const CATEGORIES: { key: FaceCategory; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { key: 'executive', label: 'Executive Leadership', icon: Crown, color: 'text-slate-700', bgColor: 'bg-slate-100' },
  { key: 'growth', label: 'Business Growth', icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { key: 'support', label: 'Support Functions', icon: HeartHandshake, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { key: 'operations', label: 'Operations', icon: Settings, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  { key: 'specialized', label: 'Specialized', icon: Sparkles, color: 'text-amber-600', bgColor: 'bg-amber-50' },
];

const CATEGORY_OPTIONS: { value: FaceCategory; label: string }[] = [
  { value: 'executive', label: 'Executive Leadership' },
  { value: 'growth', label: 'Business Growth' },
  { value: 'support', label: 'Support Functions' },
  { value: 'operations', label: 'Operations' },
  { value: 'specialized', label: 'Specialized' },
];

function formatBudget(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M UZS`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K UZS`;
  }
  return `${amount.toLocaleString()} UZS`;
}

export default function DepartmentsPage() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'grouped'>('grouped');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'bg-blue-600',
    category: 'operations' as FaceCategory,
    accountable_person_id: '',
    manager_id: '',
  });

  // Dropdown state for actions
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.filter((e: Employee & { status: string }) =>
          ['active', 'probation'].includes(e.status)
        ));
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const openCreateModal = () => {
    setEditingDepartment(null);
    setFormData({
      name: '',
      description: '',
      color: 'bg-blue-600',
      category: 'operations',
      accountable_person_id: '',
      manager_id: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      color: dept.color,
      category: dept.category || 'operations',
      accountable_person_id: dept.accountable_person_id || '',
      manager_id: dept.manager_id || '',
    });
    setError(null);
    setIsModalOpen(true);
    setOpenDropdown(null);
  };

  const openDeleteModal = (dept: Department) => {
    setDeletingDepartment(dept);
    setIsDeleteModalOpen(true);
    setOpenDropdown(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Function name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = editingDepartment
        ? `/api/departments/${editingDepartment.id}`
        : '/api/departments';
      const method = editingDepartment ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color,
          category: formData.category,
          accountable_person_id: formData.accountable_person_id || null,
          manager_id: formData.manager_id || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save function');
      }

      await fetchDepartments();
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save function');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDepartment) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/departments/${deletingDepartment.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete function');
      }

      await fetchDepartments();
      setIsDeleteModalOpen(false);
      setDeletingDepartment(null);
    } catch (err) {
      console.error('Error deleting function:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const totalEmployees = departments.reduce((sum, d) => sum + d.employee_count, 0);
  const totalBudget = departments.reduce((sum, d) => sum + d.total_budget, 0);

  const filteredDepartments = departments.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.manager?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.accountable_person?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group departments by category
  const groupedDepartments = CATEGORIES.map(cat => ({
    ...cat,
    departments: filteredDepartments
      .filter(d => d.category === cat.key)
      .sort((a, b) => a.display_order - b.display_order)
  })).filter(group => group.departments.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const renderDepartmentCard = (dept: Department) => (
    <div
      key={dept.id}
      className="border border-gray-200 rounded-xl p-5 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${dept.color} rounded-xl flex items-center justify-center`}>
          <Building2 size={20} className="text-white" />
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === dept.id ? null : dept.id);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={18} />
          </button>
          {openDropdown === dept.id && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-32">
              <button
                onClick={() => openEditModal(dept)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit size={14} />
                Edit
              </button>
              <button
                onClick={() => openDeleteModal(dept)}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{dept.name}</h3>

      {/* Accountable Person Badge */}
      {dept.accountable_person && (
        <div className="flex items-center gap-1.5 mb-2">
          <UserCircle size={14} className="text-purple-500" />
          <span className="text-xs font-medium text-purple-600">{dept.accountable_person.full_name}</span>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{dept.description || 'No description'}</p>

      <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
        <span className="flex items-center gap-1">
          <Users size={14} className="text-gray-400" />
          {dept.employee_count}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign size={14} className="text-gray-400" />
          {formatBudget(dept.total_budget)}
        </span>
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dept.manager ? (
            <>
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {dept.manager.full_name.charAt(0)}
                </span>
              </div>
              <span className="text-sm text-gray-600">{dept.manager.full_name}</span>
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">No manager</span>
          )}
        </div>
        <Link href={`/departments/${dept.id}`}>
          <ChevronRight size={16} className="text-gray-400" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.nav.departments}</h1>
          <p className="text-gray-600 mt-1">FACe - Function Accountability Chart (14 Functions)</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={18} />
          Add Function
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Building2 size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              <p className="text-sm text-gray-500">Functions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Layers size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{CATEGORIES.length}</p>
              <p className="text-sm text-gray-500">Categories</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
              <p className="text-sm text-gray-500">Employees</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <DollarSign size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatBudget(totalBudget)}</p>
              <p className="text-sm text-gray-500">Monthly Budget</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search functions, managers, or accountable persons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-2 rounded-md ${viewMode === 'grouped' ? 'bg-purple-50 text-purple-600' : 'text-gray-400'}`}
                title="Grouped by Category"
              >
                <Layers size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-purple-50 text-purple-600' : 'text-gray-400'}`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-purple-50 text-purple-600' : 'text-gray-400'}`}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Departments Content */}
        <div className="p-4">
          {filteredDepartments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No functions found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-purple-600 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : viewMode === 'grouped' ? (
            // Grouped View by Category
            <div className="space-y-8">
              {groupedDepartments.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.key}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 ${group.bgColor} rounded-lg`}>
                        <Icon size={20} className={group.color} />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">{group.label}</h2>
                        <p className="text-sm text-gray-500">{group.departments.length} function{group.departments.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.departments.map(renderDepartmentCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map(renderDepartmentCard)}
            </div>
          ) : (
            // List View
            <div className="space-y-3">
              {filteredDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-200 hover:bg-purple-50/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${dept.color} rounded-lg flex items-center justify-center`}>
                      <Building2 size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{dept.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {dept.accountable_person && (
                          <span className="flex items-center gap-1 text-purple-600">
                            <UserCircle size={12} />
                            {dept.accountable_person.full_name}
                          </span>
                        )}
                        {dept.accountable_person && dept.manager && <span className="text-gray-300">•</span>}
                        {dept.manager && <span>Manager: {dept.manager.full_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{dept.employee_count}</p>
                      <p className="text-xs text-gray-500">Employees</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatBudget(dept.total_budget)}</p>
                      <p className="text-xs text-gray-500">Budget</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(dept)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(dept)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingDepartment ? 'Edit Function' : 'Add Function'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Function Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., HR, Sales Management"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as FaceCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Accountable Person
                </label>
                <select
                  value={formData.accountable_person_id}
                  onChange={(e) => setFormData({ ...formData, accountable_person_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">No accountable person</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.position}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Person accountable for this function per FACe</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Brief description of the function..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-lg ${color.value} ${
                        formData.color === color.value
                          ? 'ring-2 ring-offset-2 ring-gray-900'
                          : ''
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Function Manager
                </label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">No manager</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {editingDepartment ? 'Save Changes' : 'Create Function'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingDepartment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Delete Function</h2>
              </div>

              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{deletingDepartment.name}</strong>?
                {deletingDepartment.employee_count > 0 && (
                  <span className="block mt-2 text-amber-600">
                    This function has {deletingDepartment.employee_count} employee(s) assigned.
                    They will be unassigned from this function.
                  </span>
                )}
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingDepartment(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
