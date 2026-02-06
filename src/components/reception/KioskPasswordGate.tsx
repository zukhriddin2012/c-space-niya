'use client';

import { useState, useEffect } from 'react';
import { Building2, Lock, LogIn, Loader2 } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
}

interface KioskPasswordGateProps {
  onAuthenticated: (branchId: string, branchName: string, expiresAt: string) => void;
}

export function KioskPasswordGate({ onAuthenticated }: KioskPasswordGateProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const response = await fetch('/api/reception/kiosk/branches');
        const data = await response.json();
        setBranches(data.branches || []);
        if (data.branches?.length === 1) {
          setSelectedBranchId(data.branches[0].id);
        }
      } catch {
        setError('Failed to load branches');
      } finally {
        setLoadingBranches(false);
      }
    }
    fetchBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedBranchId) {
      setError('Please select a branch');
      return;
    }
    if (!password) {
      setError('Please enter the password');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/reception/kiosk/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: selectedBranchId, password }),
      });

      const data = await response.json();

      if (data.success) {
        onAuthenticated(data.branchId, data.branchName, data.expiresAt);
      } else {
        switch (data.error) {
          case 'invalid_password':
            setError('Invalid password. Please try again.');
            break;
          case 'reception_not_enabled':
            setError('Reception kiosk is not enabled for this branch.');
            break;
          case 'branch_not_found':
            setError('Branch not found.');
            break;
          default:
            setError('Authentication failed. Please try again.');
        }
        setPassword('');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reception Kiosk</h1>
          <p className="text-gray-500 text-sm mt-1">C-Space Coworking</p>
        </div>

        {loadingBranches ? (
          <div className="text-center py-8">
            <Loader2 size={24} className="animate-spin mx-auto text-purple-500 mb-2" />
            <p className="text-sm text-gray-500">Loading branches...</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-8">
            <Lock size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No branches have kiosk mode enabled.</p>
            <p className="text-xs text-gray-400 mt-1">Contact your manager to set up kiosk access.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Branch Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Branch
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                required
                disabled={submitting}
              >
                {branches.length > 1 && <option value="">Select a branch...</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter branch password"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  required
                  disabled={submitting}
                  autoFocus={branches.length === 1}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !selectedBranchId}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-xl font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {submitting ? 'Authenticating...' : 'Enter Reception'}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          Session stays active until password is changed
        </p>
      </div>
    </div>
  );
}
