'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { ArrowLeft, Building2, KeyRound, Check, AlertCircle, Trash2, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface BranchPasswordStatus {
  id: string;
  name: string;
  hasPassword: boolean;
}

export default function KioskPasswordPage() {
  const { user, isRole, isAnyRole } = useAuth();
  const { t } = useTranslation();
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
          // For each branch, check if it has a kiosk password
          const branchList = (data.branches || data || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            hasPassword: !!b.reception_password_hash,
          }));

          // Branch managers can only see their own branch
          if (isRole('branch_manager') && user?.branchId) {
            setBranches(branchList.filter((b: BranchPasswordStatus) => b.id === user.branchId));
          } else {
            setBranches(branchList);
          }
        }
      } catch (err) {
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
        setBranches(prev =>
          prev.map(b => b.id === selectedBranch ? { ...b, hasPassword: true } : b)
        );
        setNewPassword('');
        setConfirmPassword('');
        setSuccess('Kiosk password has been set successfully');
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const data = await response.json();
        setError(data.error === 'can_only_manage_own_branch'
          ? 'You can only manage your own branch'
          : data.error || 'Failed to set password');
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
      const response = await fetch(`/api/reception/kiosk/admin/password?branchId=${branchId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBranches(prev =>
          prev.map(b => b.id === branchId ? { ...b, hasPassword: false } : b)
        );
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <KeyRound size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">You don&apos;t have permission to manage kiosk passwords.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/reception/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reception Kiosk Passwords</h1>
          <p className="text-sm text-gray-500">Set up passwords for standalone reception kiosk access per branch</p>
        </div>
      </div>

      {/* Kiosk Link Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
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
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
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
        <div className="space-y-4">
          {/* Branch List */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            {branches.map((branch) => (
              <div key={branch.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    branch.hasPassword ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
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
                    onClick={() => {
                      setSelectedBranch(branch.id);
                      setNewPassword('');
                      setConfirmPassword('');
                      setError(null);
                    }}
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
                <span className="text-purple-600 ml-2">
                  — {branches.find(b => b.id === selectedBranch)?.name}
                </span>
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
        </div>
      )}
    </div>
  );
}
