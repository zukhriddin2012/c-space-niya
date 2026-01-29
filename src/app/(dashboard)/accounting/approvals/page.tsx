'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  AlertTriangle,
  User,
  Building2,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getStatusLabel,
  getStatusColor,
  formatCurrency,
  formatRelativeTime,
  formatDate,
  getSlaStatus,
  getSlaRemainingText,
  getSlaColor,
  transformRequestListItem,
} from '@/modules/accounting/lib/utils';
import { APPROVAL_THRESHOLDS } from '@/modules/accounting/lib/constants';
import type { AccountingRequest } from '@/modules/accounting/types';

interface ApprovalRequest extends AccountingRequest {
  requester?: { full_name: string };
  from_entity?: { name: string };
}

export default function AccountingApprovalsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const canApproveStandard = user && hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD);
  const canApproveHigh = user && hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_HIGH);
  const canApprove = canApproveStandard || canApproveHigh;

  useEffect(() => {
    if (canApprove) {
      fetchApprovals();
    }
  }, [canApprove]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('status', 'pending_approval');

      const response = await fetch(`/api/accounting/requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch approvals');

      const data = await response.json();
      const transformed = (data.data || []).map((r: Record<string, unknown>) => transformRequestListItem(r)) as ApprovalRequest[];

      // Filter to only show requests user can approve
      const filteredRequests = transformed.filter((request: ApprovalRequest) => {
        const currentStep = request.currentApprovalStep || 1;
        const approvalLevel = request.approvalLevel;

        // Chief Accountant can approve step 1 of any level
        if (currentStep === 1 && canApproveStandard) {
          return true;
        }

        // GM/CEO can approve step 2 of executive level
        if (currentStep === 2 && approvalLevel === 'executive' && canApproveHigh) {
          return true;
        }

        return false;
      });

      setRequests(filteredRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setActionLoading(selectedRequest.id);
    try {
      const response = await fetch(`/api/accounting/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', comments: approvalComments }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve');
      }

      // Remove from list or update
      setRequests(requests.filter(r => r.id !== selectedRequest.id));
      setShowApproveModal(false);
      setSelectedRequest(null);
      setApprovalComments('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;

    setActionLoading(selectedRequest.id);
    try {
      const response = await fetch(`/api/accounting/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject');
      }

      // Remove from list
      setRequests(requests.filter(r => r.id !== selectedRequest.id));
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const openApproveModal = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setApprovalComments('');
    setShowApproveModal(true);
  };

  const openRejectModal = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const getApprovalStepText = (request: ApprovalRequest) => {
    const currentStep = request.currentApprovalStep || 1;
    const approvalLevel = request.approvalLevel;

    if (approvalLevel === 'chief_accountant') {
      return t.accounting.chiefAccountantApproval;
    }

    if (approvalLevel === 'executive') {
      if (currentStep === 1) {
        return t.accounting.chiefAccountantApproval;
      }
      return t.accounting.executiveApproval;
    }

    return t.accounting.approvalRequired;
  };

  if (!user) return null;

  if (!canApprove) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{t.errors.forbidden}</h1>
        <p className="text-gray-500">{t.errors.unauthorized}</p>
        <Link href="/accounting/my-requests" className="text-purple-600 hover:underline mt-4 inline-block">
          {t.accounting.myRequests}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.accounting.approvals}</h1>
          <p className="text-gray-500 mt-1">{t.accounting.approvalRequired}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {requests.length} {t.accounting.pendingApproval}
          </span>
          <button
            onClick={fetchApprovals}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Approvals List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle2 className="mx-auto mb-4 text-green-400" size={48} />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t.accounting.noApprovals}</h2>
          <p className="text-gray-500">{t.accounting.noRequests}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const slaStatus = getSlaStatus(request.slaDeadline || null, request.status);
            const isUrgent = request.priority === 'urgent';

            return (
              <div
                key={request.id}
                className={`bg-white rounded-xl border p-6 ${
                  isUrgent ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Request Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/accounting/requests/${request.id}`}
                            className="text-lg font-semibold text-purple-600 hover:text-purple-700"
                          >
                            {request.requestNumber}
                          </Link>
                          {isUrgent && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full border bg-red-100 text-red-800 border-red-200">
                              {t.accounting.urgent}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mt-1">{request.title}</p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">{t.accounting.amount}</p>
                        <p className="font-semibold text-green-600 text-lg">
                          {formatCurrency(request.amount!)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t.accounting.requester}</p>
                        <div className="flex items-center gap-1">
                          <User size={14} className="text-gray-400" />
                          <p className="font-medium">{request.requester?.full_name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500">{t.accounting.fromEntity}</p>
                        <div className="flex items-center gap-1">
                          <Building2 size={14} className="text-gray-400" />
                          <p className="font-medium">{request.from_entity?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500">{t.accounting.slaDeadline}</p>
                        <div className="flex items-center gap-1">
                          <Clock size={14} className={getSlaColor(slaStatus)} />
                          <p className={`font-medium ${getSlaColor(slaStatus)}`}>
                            {getSlaRemainingText(request.slaDeadline || null)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Approval Step Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {getApprovalStepText(request)}
                      </span>
                      <span className="text-gray-500">
                        •
                      </span>
                      <span className="text-gray-500">
                        Created {formatRelativeTime(request.createdAt)}
                      </span>
                    </div>

                    {/* Payment Purpose */}
                    {request.paymentPurpose && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">{t.accounting.paymentPurpose}</p>
                        <p className="text-sm text-gray-700">{request.paymentPurpose}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[140px]">
                    <button
                      onClick={() => openApproveModal(request)}
                      disabled={actionLoading === request.id}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === request.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      {t.accounting.approve}
                    </button>
                    <button
                      onClick={() => openRejectModal(request)}
                      disabled={actionLoading === request.id}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      {t.accounting.reject}
                    </button>
                    <Link
                      href={`/accounting/requests/${request.id}`}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <FileText size={16} />
                      {t.common.details}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t.accounting.approve}</h3>
                <p className="text-sm text-gray-500">{selectedRequest.requestNumber}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">{t.accounting.amount}</span>
                <span className="font-semibold text-green-600">{formatCurrency(selectedRequest.amount!)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t.accounting.recipientName}</span>
                <span className="font-medium">{selectedRequest.recipientName}</span>
              </div>
            </div>

            {selectedRequest.approvalLevel === 'executive' && selectedRequest.currentApprovalStep === 1 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>{t.common.notes}:</strong> {t.accounting.executiveApproval}
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.accounting.addComment} ({t.common.optional})
              </label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                rows={3}
                placeholder={t.accounting.addComment + '...'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                }}
                disabled={actionLoading === selectedRequest.id}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading === selectedRequest.id}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading === selectedRequest.id ? t.common.loading : t.accounting.approve}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t.accounting.reject}</h3>
                <p className="text-sm text-gray-500">{selectedRequest.requestNumber}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">{t.accounting.amount}</span>
                <span className="font-semibold">{formatCurrency(selectedRequest.amount!)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t.accounting.recipientName}</span>
                <span className="font-medium">{selectedRequest.recipientName}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.accounting.reject} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder={t.common.description + '...'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                }}
                disabled={actionLoading === selectedRequest.id}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === selectedRequest.id}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading === selectedRequest.id ? t.common.loading : t.accounting.reject}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
