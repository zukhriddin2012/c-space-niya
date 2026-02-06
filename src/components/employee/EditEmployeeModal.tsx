'use client';

import { useState, useEffect } from 'react';
import { X, Building2, Plus, Trash2, Shield, MessageCircle, Unlink, Calendar, User, FileText, MapPin, Banknote, Wallet, Send, Loader2, KeyRound, Check } from 'lucide-react';
import type { UserRole } from '@/types';

const SYSTEM_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'employee', label: 'Employee', description: 'Regular employee with basic access' },
  { value: 'branch_manager', label: 'Branch Manager', description: 'Can manage employees in their branch' },
  { value: 'recruiter', label: 'Recruiter', description: 'Access to recruitment features' },
  { value: 'hr', label: 'HR Manager', description: 'Full HR and employee management' },
  { value: 'ceo', label: 'CEO', description: 'Executive access and approvals' },
  { value: 'general_manager', label: 'General Manager', description: 'Full system access' },
];

interface Branch {
  id: string;
  name: string;
}

interface LegalEntity {
  id: string;
  name: string;
  short_name: string | null;
  inn: string | null;
  branch_id: string | null;
}

interface EmployeeWage {
  id: string;
  employee_id: string;
  legal_entity_id: string;
  wage_amount: number;
  wage_type: 'official' | 'bonus';
  notes: string | null;
  is_active: boolean;
  legal_entities?: LegalEntity;
}

interface EmployeeBranchWage {
  id: string;
  employee_id: string;
  branch_id: string;
  wage_amount: number;
  notes: string | null;
  is_active: boolean;
  branches?: Branch;
}

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  position: string;
  level: string;
  branch_id: string | null;
  salary: number | null;
  phone: string | null;
  email: string | null;
  status: string;
  employment_type?: string;
  hire_date: string;
  date_of_birth?: string | null;
  gender?: string | null;
  notes?: string | null;
  telegram_id?: string | null;
  branches?: { name: string };
  system_role?: UserRole;
}

interface EditEmployeeModalProps {
  employee: Employee;
  branches: Branch[];
  onClose: () => void;
  onSave: (employee: Employee) => void;
  canEditSalary: boolean;
  canAssignRoles?: boolean;
}

function formatSalary(amount: number): string {
  if (!amount || amount === 0) return '0 UZS';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

export default function EditEmployeeModal({
  employee,
  branches,
  onClose,
  onSave,
  canEditSalary,
  canAssignRoles = false,
}: EditEmployeeModalProps) {
  const [formData, setFormData] = useState({
    full_name: employee.full_name,
    position: employee.position,
    level: employee.level || 'junior',
    branch_id: employee.branch_id || '',
    phone: employee.phone || '',
    email: employee.email || '',
    status: employee.status,
    employment_type: employee.employment_type || 'full-time',
    system_role: (employee.system_role || 'employee') as UserRole,
    hire_date: employee.hire_date || '',
    date_of_birth: employee.date_of_birth || '',
    gender: employee.gender || '',
    notes: employee.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(employee.telegram_id || null);
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);

  // Send PIN to Telegram state
  const [showSendPin, setShowSendPin] = useState(false);
  const [sendingPin, setSendingPin] = useState(false);
  const [sendPinBranchPassword, setSendPinBranchPassword] = useState('');
  const [sendPinSuccess, setSendPinSuccess] = useState(false);
  const [sendPinError, setSendPinError] = useState<string | null>(null);

  // Primary wages (bank/legal entities) state
  const [wages, setWages] = useState<EmployeeWage[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [loadingWages, setLoadingWages] = useState(true);
  const [showAddWage, setShowAddWage] = useState(false);
  const [newWage, setNewWage] = useState({ entity_id: '', amount: '' });

  // Additional wages (cash/branches) state
  const [branchWages, setBranchWages] = useState<EmployeeBranchWage[]>([]);
  const [showAddBranchWage, setShowAddBranchWage] = useState(false);
  const [newBranchWage, setNewBranchWage] = useState({ branch_id: '', amount: '' });

  // Calculate totals
  const primaryTotal = wages.reduce((sum, w) => sum + (w.wage_amount || 0), 0);
  const additionalTotal = branchWages.reduce((sum, w) => sum + (w.wage_amount || 0), 0);
  const totalSalary = primaryTotal + additionalTotal;

  // Fetch wages, branch wages, and legal entities
  useEffect(() => {
    async function fetchData() {
      try {
        const [wagesRes, branchWagesRes, entitiesRes] = await Promise.all([
          fetch(`/api/employees/${employee.id}/wages`),
          fetch(`/api/employees/${employee.id}/branch-wages`),
          fetch('/api/legal-entities'),
        ]);

        if (wagesRes.ok) {
          const data = await wagesRes.json();
          // Filter to only include primary wages - the combined endpoint returns both
          // primary (employee_wages) and additional (employee_branch_wages) entries.
          // Additional wages are fetched separately via branch-wages endpoint below.
          const primaryOnly = (data.wages || []).filter(
            (w: { source_type?: string }) => w.source_type === 'primary' || !w.source_type
          );
          setWages(primaryOnly);
        }

        if (branchWagesRes.ok) {
          const data = await branchWagesRes.json();
          setBranchWages(data.wages || []);
        }

        if (entitiesRes.ok) {
          const data = await entitiesRes.json();
          setLegalEntities(data.entities || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoadingWages(false);
      }
    }
    fetchData();
  }, [employee.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          branch_id: formData.branch_id || null,
          salary: totalSalary, // Update salary to match total wages
          system_role: canAssignRoles ? formData.system_role : undefined,
          hire_date: formData.hire_date || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update employee');
      }

      const data = await response.json();
      // Update employee with new total salary, role, and telegram_id
      onSave({
        ...data.employee,
        salary: totalSalary,
        system_role: formData.system_role,
        telegram_id: telegramId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!telegramId) return;

    setDisconnectingTelegram(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}/telegram`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTelegramId(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disconnect Telegram');
      }
    } catch (err) {
      setError('Failed to disconnect Telegram');
    } finally {
      setDisconnectingTelegram(false);
    }
  };

  const handleSendPinToTelegram = async () => {
    if (!telegramId) return;

    setSendingPin(true);
    setSendPinError(null);
    setSendPinSuccess(false);

    try {
      const response = await fetch(`/api/employees/${employee.id}/send-pin-telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchPassword: sendPinBranchPassword || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendPinSuccess(true);
        setSendPinBranchPassword('');
        // Auto-hide success after 3 seconds
        setTimeout(() => {
          setSendPinSuccess(false);
          setShowSendPin(false);
        }, 3000);
      } else {
        setSendPinError(data.error || 'Failed to send PIN');
      }
    } catch (err) {
      setSendPinError('Failed to send PIN to Telegram');
    } finally {
      setSendingPin(false);
    }
  };

  const handleAddWage = async () => {
    if (!newWage.entity_id || !newWage.amount) return;

    try {
      const response = await fetch(`/api/employees/${employee.id}/wages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_id: newWage.entity_id,
          wage_amount: parseFloat(newWage.amount),
          wage_type: 'official',
        }),
      });

      if (response.ok) {
        const wagesRes = await fetch(`/api/employees/${employee.id}/wages`);
        if (wagesRes.ok) {
          const data = await wagesRes.json();
          // Filter to only include primary wages
          const primaryOnly = (data.wages || []).filter(
            (w: { source_type?: string }) => w.source_type === 'primary' || !w.source_type
          );
          setWages(primaryOnly);
        }
        setNewWage({ entity_id: '', amount: '' });
        setShowAddWage(false);
      }
    } catch (err) {
      console.error('Error adding wage:', err);
    }
  };

  const handleRemoveWage = async (wageId: string) => {
    try {
      const response = await fetch(`/api/employees/${employee.id}/wages?wage_id=${wageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWages(wages.filter(w => w.id !== wageId));
      }
    } catch (err) {
      console.error('Error removing wage:', err);
    }
  };

  // Get available entities (not already assigned)
  const availableEntities = legalEntities.filter(
    e => !wages.some(w => w.legal_entity_id === e.id)
  );

  // Get available branches for additional wages (not already assigned)
  const availableBranches = branches.filter(
    b => !branchWages.some(w => w.branch_id === b.id)
  );

  const handleAddBranchWage = async () => {
    if (!newBranchWage.branch_id || !newBranchWage.amount) return;

    try {
      const response = await fetch(`/api/employees/${employee.id}/branch-wages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: newBranchWage.branch_id,
          wage_amount: parseFloat(newBranchWage.amount),
        }),
      });

      if (response.ok) {
        const branchWagesRes = await fetch(`/api/employees/${employee.id}/branch-wages`);
        if (branchWagesRes.ok) {
          const data = await branchWagesRes.json();
          setBranchWages(data.wages || []);
        }
        setNewBranchWage({ branch_id: '', amount: '' });
        setShowAddBranchWage(false);
      }
    } catch (err) {
      console.error('Error adding branch wage:', err);
    }
  };

  const handleRemoveBranchWage = async (wageId: string) => {
    try {
      const response = await fetch(`/api/employees/${employee.id}/branch-wages?wage_id=${wageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBranchWages(branchWages.filter(w => w.id !== wageId));
      }
    } catch (err) {
      console.error('Error removing branch wage:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Employee</h2>
            <p className="text-sm text-gray-500">{employee.employee_id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="junior">Junior</option>
                  <option value="middle">Middle</option>
                  <option value="senior">Senior</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="">No Branch (HQ)</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type
              </label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="internship">Internship</option>
                <option value="probation">Probation Period</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  placeholder="+998 XX XXX XX XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <User size={18} className="text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Personal Information</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <FileText size={14} />
                  Notes
                </div>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Any special notes about this employee (e.g., termination date, special conditions)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Telegram Bot Connection Section */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Telegram Bot Connection</h3>
            </div>

            {telegramId ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageCircle size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Connected to C-Space Time Bot</p>
                      <p className="text-xs text-blue-600">Telegram ID: {telegramId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSendPin(!showSendPin);
                        setSendPinError(null);
                        setSendPinSuccess(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <Send size={14} />
                      Send PIN
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectTelegram}
                      disabled={disconnectingTelegram}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Unlink size={14} />
                      {disconnectingTelegram ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                </div>

                {/* Send PIN to Telegram Panel */}
                {showSendPin && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <KeyRound size={16} className="text-purple-600" />
                      <h4 className="text-sm font-semibold text-purple-900">Send PIN to Telegram</h4>
                    </div>

                    <p className="text-xs text-purple-700">
                      A new 6-digit PIN will be generated and sent to this employee&apos;s Telegram along with their branch info.
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-600 bg-white/60 rounded-lg p-2">
                      <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                      <span>Branch: <strong>{branches.find(b => b.id === formData.branch_id)?.name || 'No branch'}</strong></span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-purple-700 mb-1">
                        Branch Password (optional)
                      </label>
                      <input
                        type="text"
                        value={sendPinBranchPassword}
                        onChange={(e) => setSendPinBranchPassword(e.target.value)}
                        placeholder="Enter branch kiosk password to include"
                        className="w-full px-3 py-1.5 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                      />
                    </div>

                    {sendPinError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {sendPinError}
                      </div>
                    )}

                    {sendPinSuccess && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                        <Check size={14} />
                        PIN generated and sent to Telegram successfully!
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSendPin(false);
                          setSendPinError(null);
                          setSendPinSuccess(false);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSendPinToTelegram}
                        disabled={sendingPin || sendPinSuccess}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        {sendingPin ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Sending...
                          </>
                        ) : sendPinSuccess ? (
                          <>
                            <Check size={14} />
                            Sent!
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            Generate &amp; Send PIN
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <MessageCircle size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Not connected to Telegram Bot</p>
                <p className="text-xs text-gray-400 mt-1">Employee can connect via /register command in the bot</p>
              </div>
            )}
          </div>

          {/* System Role Section - only for users who can assign roles */}
          {canAssignRoles && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">System Access Role</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {SYSTEM_ROLES.map((role) => (
                  <label
                    key={role.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.system_role === role.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="system_role"
                      value={role.value}
                      checked={formData.system_role === role.value}
                      onChange={(e) => setFormData({ ...formData, system_role: e.target.value as UserRole })}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{role.label}</p>
                      <p className="text-xs text-gray-500">{role.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {formData.system_role === 'branch_manager' && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="text-sm text-teal-700">
                    <strong>Note:</strong> Branch Manager will have access to manage employees in the branch selected above ({branches.find(b => b.id === formData.branch_id)?.name || 'No branch selected'}).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Salary Summary Section */}
          {canEditSalary && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Salary Summary</h3>
              </div>

              {/* Total Salary Display with breakdown */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-600">Total Monthly Salary</span>
                  <span className="text-xl font-bold text-purple-700">{formatSalary(totalSalary)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-purple-200">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Banknote size={12} className="text-indigo-500" />
                      Primary: {formatSalary(primaryTotal)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-emerald-500" />
                      Additional: {formatSalary(additionalTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Primary Wages Section (Bank/Legal Entities) */}
          {canEditSalary && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Primary Wages (Bank)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddWage(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              {/* Primary Wages List */}
              {loadingWages ? (
                <div className="text-center py-4 text-gray-500">Loading wages...</div>
              ) : wages.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <Building2 size={24} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No primary wages assigned</p>
                  <p className="text-xs text-gray-400">Add wages from legal entities</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {wages.map((wage) => (
                    <div
                      key={wage.id}
                      className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 size={16} className="text-indigo-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {wage.legal_entities?.short_name || wage.legal_entities?.name || wage.legal_entity_id}
                          </p>
                          {wage.legal_entities?.inn && (
                            <p className="text-xs text-gray-500">INN: {wage.legal_entities.inn}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{formatSalary(wage.wage_amount)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWage(wage.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Primary Wage Form */}
              {showAddWage && (
                <div className="p-4 bg-indigo-50 rounded-lg space-y-3 border border-indigo-200">
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newWage.entity_id}
                      onChange={(e) => setNewWage({ ...newWage, entity_id: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    >
                      <option value="">Select legal entity...</option>
                      {availableEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.short_name || entity.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={newWage.amount}
                      onChange={(e) => setNewWage({ ...newWage, amount: e.target.value })}
                      placeholder="Amount (UZS)"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      min="0"
                      step="100000"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddWage(false)}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddWage}
                      disabled={!newWage.entity_id || !newWage.amount}
                      className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      Add Primary Wage
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional Wages Section (Cash/Branches) */}
          {canEditSalary && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Additional Wages (Cash)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBranchWage(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              {/* Additional Wages List */}
              {loadingWages ? (
                <div className="text-center py-4 text-gray-500">Loading wages...</div>
              ) : branchWages.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <MapPin size={24} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No additional wages assigned</p>
                  <p className="text-xs text-gray-400">Add cash wages from branches</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {branchWages.map((wage) => (
                    <div
                      key={wage.id}
                      className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin size={16} className="text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {wage.branches?.name || wage.branch_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{formatSalary(wage.wage_amount)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBranchWage(wage.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Additional Wage Form */}
              {showAddBranchWage && (
                <div className="p-4 bg-emerald-50 rounded-lg space-y-3 border border-emerald-200">
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newBranchWage.branch_id}
                      onChange={(e) => setNewBranchWage({ ...newBranchWage, branch_id: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                    >
                      <option value="">Select branch...</option>
                      {availableBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={newBranchWage.amount}
                      onChange={(e) => setNewBranchWage({ ...newBranchWage, amount: e.target.value })}
                      placeholder="Amount (UZS)"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      min="0"
                      step="100000"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBranchWage(false)}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddBranchWage}
                      disabled={!newBranchWage.branch_id || !newBranchWage.amount}
                      className="flex-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      Add Additional Wage
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
