'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  FileText,
  UserMinus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Building2,
  MapPin,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRight,
  Calendar,
  Loader2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface TerminationRequest {
  id: string;
  requested_date: string;
  reason: string;
  status: string;
  created_at: string;
  employee?: { id: string; full_name: string; employee_id: string; position: string } | null;
  requester?: { full_name: string } | null;
}

interface WageChangeRequest {
  id: string;
  wage_type: string;
  current_amount: number;
  proposed_amount: number;
  change_type: string;
  reason: string;
  effective_date: string;
  status: string;
  created_at: string;
  employee?: { id: string; full_name: string; employee_id: string; position: string } | null;
  requester?: { full_name: string } | null;
  legal_entity?: { name: string } | null;
  branch?: { name: string } | null;
}

interface PaymentRequest {
  id: string;
  request_type: string;
  total_amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

interface ApprovalsHubProps {
  counts: {
    terminations: number;
    wageChanges: number;
    paymentRequests: number;
    total: number;
  };
  terminationRequests: TerminationRequest[];
  wageChangeRequests: WageChangeRequest[];
  paymentRequests: PaymentRequest[];
}

type TabType = 'all' | 'terminations' | 'wage_changes' | 'payments';

function formatSalary(amount: number): string {
  if (!amount || amount === 0) return '0 UZS';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateString);
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700', icon: <Clock size={14} /> },
    submitted: { label: 'Submitted', className: 'bg-blue-50 text-blue-700', icon: <FileText size={14} /> },
    pending_review: { label: 'In Review', className: 'bg-purple-50 text-purple-700', icon: <Clock size={14} /> },
    approved: { label: 'Approved', className: 'bg-green-50 text-green-700', icon: <CheckCircle size={14} /> },
    rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700', icon: <XCircle size={14} /> },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

export function ApprovalsHub({
  counts,
  terminationRequests,
  wageChangeRequests,
  paymentRequests,
}: ApprovalsHubProps) {
  useTranslation(); // Keep for future i18n
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApproveTermination = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/termination-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to approve');
      }
      setSuccess('Termination request approved');
      setTimeout(() => { setSuccess(null); window.location.reload(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTermination = async (id: string) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) {
      return; // User cancelled or provided empty reason
    }
    setProcessingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/termination-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejection_reason: reason }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to reject');
      }
      setSuccess('Termination request rejected');
      setTimeout(() => { setSuccess(null); window.location.reload(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveWageChange = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/wage-change-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to approve');
      }
      setSuccess('Wage change approved');
      setTimeout(() => { setSuccess(null); window.location.reload(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWageChange = async (id: string) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) {
      return; // User cancelled or provided empty reason
    }
    setProcessingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/wage-change-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejection_reason: reason }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to reject');
      }
      setSuccess('Wage change rejected');
      setTimeout(() => { setSuccess(null); window.location.reload(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { key: 'all' as TabType, label: 'All', count: counts.total },
    { key: 'terminations' as TabType, label: 'Terminations', count: counts.terminations, icon: UserMinus },
    { key: 'wage_changes' as TabType, label: 'Wage Changes', count: counts.wageChanges, icon: TrendingUp },
    { key: 'payments' as TabType, label: 'Payment Requests', count: counts.paymentRequests, icon: FileText },
  ];

  const showTerminations = activeTab === 'all' || activeTab === 'terminations';
  const showWageChanges = activeTab === 'all' || activeTab === 'wage_changes';
  const showPayments = activeTab === 'all' || activeTab === 'payments';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500 mt-1">
            Review and approve requests across all categories
          </p>
        </div>
        <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-medium">
          {counts.total} pending request{counts.total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <UserMinus size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{counts.terminations}</p>
              <p className="text-sm text-gray-500">Termination Requests</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{counts.wageChanges}</p>
              <p className="text-sm text-gray-500">Wage Change Requests</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{counts.paymentRequests}</p>
              <p className="text-sm text-gray-500">Payment Requests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon && <tab.icon size={16} />}
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {counts.total === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-600 font-medium">All caught up!</p>
          <p className="text-gray-500 text-sm mt-1">No pending requests to review</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Termination Requests */}
          {showTerminations && terminationRequests.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserMinus size={20} className="text-red-600" />
                  <h2 className="font-semibold text-gray-900">Termination Requests</h2>
                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {terminationRequests.length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {terminationRequests.map((request) => (
                  <div key={request.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <User size={20} className="text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {request.employee?.full_name || 'Unknown Employee'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.employee?.position} • {request.employee?.employee_id}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <div className="mt-3 ml-13 pl-13">
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="text-gray-500">Reason:</span> {request.reason}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Requested for: {formatDate(request.requested_date)}
                        </span>
                        <span>Submitted: {formatRelativeTime(request.created_at)}</span>
                        <span>By: {request.requester?.full_name || 'Unknown'}</span>
                      </div>
                    </div>
                    {request.status === 'pending' && (
                      <div className="mt-4 flex gap-2 ml-13">
                        <button
                          onClick={() => handleRejectTermination(request.id)}
                          disabled={processingId === request.id}
                          className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          {processingId === request.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveTermination(request.id)}
                          disabled={processingId === request.id}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          {processingId === request.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wage Change Requests */}
          {showWageChanges && wageChangeRequests.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Wage Change Requests</h2>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {wageChangeRequests.length}
                  </span>
                </div>
                <Link
                  href="/wage-change-requests"
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {wageChangeRequests.map((request) => (
                  <div key={request.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {request.change_type === 'increase' ? (
                            <ArrowUpCircle size={20} className="text-green-600" />
                          ) : (
                            <ArrowDownCircle size={20} className="text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {request.employee?.full_name || 'Unknown Employee'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.employee?.position} • {request.wage_type === 'primary' ? 'Primary Wage' : 'Additional Wage'}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Current → Proposed</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-600">{formatSalary(request.current_amount)}</span>
                          <span className="text-gray-400">→</span>
                          <span className={`font-semibold ${request.change_type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                            {formatSalary(request.proposed_amount)}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 ${request.change_type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                          {request.change_type === 'increase' ? '+' : '-'}
                          {request.current_amount > 0
                            ? Math.round(Math.abs((request.proposed_amount - request.current_amount) / request.current_amount * 100))
                            : 100}%
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">
                          {request.wage_type === 'primary' ? 'Legal Entity' : 'Branch'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {request.wage_type === 'primary' ? (
                            <Building2 size={14} className="text-gray-400" />
                          ) : (
                            <MapPin size={14} className="text-gray-400" />
                          )}
                          <span className="font-medium text-gray-900">
                            {request.wage_type === 'primary'
                              ? request.legal_entity?.name || 'Unknown'
                              : request.branch?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      <p className="text-gray-700">
                        <span className="text-gray-500">Reason:</span> {request.reason}
                      </p>
                      <div className="flex items-center gap-4 text-gray-500 mt-2">
                        <span>Effective: {formatDate(request.effective_date)}</span>
                        <span>By: {request.requester?.full_name || 'Unknown'}</span>
                      </div>
                    </div>
                    {request.status === 'pending' && (
                      <div className="mt-4 flex gap-2">
                        <Link
                          href="/wage-change-requests"
                          className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          Review Details
                        </Link>
                        <button
                          onClick={() => handleRejectWageChange(request.id)}
                          disabled={processingId === request.id}
                          className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          {processingId === request.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveWageChange(request.id)}
                          disabled={processingId === request.id}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          {processingId === request.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Requests */}
          {showPayments && paymentRequests.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-amber-600" />
                  <h2 className="font-semibold text-gray-900">Payment Requests</h2>
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {paymentRequests.length}
                  </span>
                </div>
                <Link
                  href="/accounting/approvals"
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  Review in detail <ArrowRight size={14} />
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {paymentRequests.map((request) => (
                  <div key={request.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                          <FileText size={20} className="text-amber-600" />
                        </div>
                        <div>
                          <Link
                            href={`/accounting/requests/${request.id}`}
                            className="font-medium text-purple-600 hover:text-purple-700"
                          >
                            {request.request_type.toUpperCase()}-{request.id.slice(0, 8).toUpperCase()}
                          </Link>
                          <p className="text-sm text-gray-500">
                            {request.description || request.request_type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatSalary(request.total_amount)}</p>
                        <StatusBadge status={request.status} />
                      </div>
                    </div>
                    <div className="mt-2 ml-13 text-sm text-gray-500">
                      <span>Created: {formatRelativeTime(request.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100">
                <Link
                  href="/accounting/approvals"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <ClipboardCheck size={18} />
                  Go to Payment Approvals
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
