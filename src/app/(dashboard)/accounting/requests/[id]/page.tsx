'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  User,
  Building2,
  Calendar,
  MessageSquare,
  Paperclip,
  Edit,
  X,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Info,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getStatusLabel,
  getStatusColor,
  getRequestTypeLabel,
  getRequestTypeColor,
  getPriorityLabel,
  getPriorityColor,
  getPaymentCategoryLabel,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getSlaStatus,
  getSlaRemainingText,
  getSlaColor,
  getRequiredApprovalLevel,
  transformRequestFromApi,
} from '@/modules/accounting/lib/utils';
import { APPROVAL_THRESHOLDS } from '@/modules/accounting/lib/constants';
import type { AccountingRequest, AccountingComment } from '@/modules/accounting/types';

export default function AccountingRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<AccountingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Translation helpers
  const getStatusLabelTranslated = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: t.accounting.pending,
      in_progress: t.accounting.inProgress,
      needs_info: t.accounting.needsInfo,
      pending_approval: t.accounting.pendingApproval,
      approved: t.accounting.approved,
      completed: t.accounting.completed,
      rejected: t.accounting.rejected,
      cancelled: t.accounting.cancelled,
    };
    return statusMap[status] || status;
  };

  const getTypeLabelTranslated = (type: string): string => {
    const typeMap: Record<string, string> = {
      reconciliation: t.accounting.reconciliation,
      payment: t.accounting.payment,
      confirmation: t.accounting.confirmation,
    };
    return typeMap[type] || type;
  };

  const getPriorityLabelTranslated = (priority: string): string => {
    const priorityMap: Record<string, string> = {
      normal: t.accounting.normal,
      urgent: t.accounting.urgent,
    };
    return priorityMap[priority] || priority;
  };

  const getCategoryLabelTranslated = (category: string): string => {
    const categoryMap: Record<string, string> = {
      utilities: t.accounting.utilities,
      rent: t.accounting.rent,
      salary: t.accounting.salary,
      supplies: t.accounting.supplies,
      services: t.accounting.services,
      equipment: t.accounting.equipment,
      taxes: t.accounting.taxes,
      other: t.accounting.other,
    };
    return categoryMap[category] || category;
  };

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApprovalRejectModal, setShowApprovalRejectModal] = useState(false);
  const [approvalRejectReason, setApprovalRejectReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');

  // Comments
  const [comments, setComments] = useState<AccountingComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Permissions
  const canProcess = user && hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS);
  const canApproveStandard = user && hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD);
  const canApproveHigh = user && hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_HIGH);
  const isOwner = request && user && request.requesterId === user.id;
  const canCancel = isOwner && request?.status === 'pending';
  const canEdit = isOwner && (request?.status === 'pending' || request?.status === 'needs_info');

  // Get request ID from params
  useEffect(() => {
    params.then(p => setRequestId(p.id));
  }, [params]);

  // Fetch request
  useEffect(() => {
    if (!requestId) return;

    async function fetchRequest() {
      try {
        const response = await fetch(`/api/accounting/requests/${requestId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Request not found');
          } else {
            throw new Error('Failed to fetch request');
          }
          return;
        }

        const data = await response.json();
        const transformed = transformRequestFromApi(data) as unknown as AccountingRequest;
        setRequest(transformed);
        setComments(transformed.comments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchRequest();
  }, [requestId]);

  // Handlers
  const handleCancel = async () => {
    if (!requestId || !cancelReason.trim()) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/accounting/requests/${requestId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel request');
      }

      const data = await response.json();
      setRequest(transformRequestFromApi(data) as unknown as AccountingRequest);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string, notes?: string) => {
    if (!requestId) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/accounting/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changeStatus', status: newStatus, notes, assignToSelf: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      const data = await response.json();
      setRequest(transformRequestFromApi(data) as unknown as AccountingRequest);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!requestId) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/accounting/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', comments: approvalComments }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve request');
      }

      const data = await response.json();
      setRequest(transformRequestFromApi(data) as unknown as AccountingRequest);
      setShowApproveModal(false);
      setApprovalComments('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovalReject = async () => {
    if (!requestId || !approvalRejectReason.trim()) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/accounting/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: approvalRejectReason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject approval');
      }

      const data = await response.json();
      setRequest(transformRequestFromApi(data) as unknown as AccountingRequest);
      setShowApprovalRejectModal(false);
      setApprovalRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject approval');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/accounting/requests/${requestId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          isInternal: isInternalComment,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add comment');
      }

      const data = await response.json();
      setComments([...comments, data]);
      setNewComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Check if user can approve at current step
  const canApproveAtCurrentStep = () => {
    if (!request || request.status !== 'pending_approval') return false;

    const currentStep = request.currentApprovalStep || 1;
    const approvalLevel = request.approvalLevel;

    if (currentStep === 1 && approvalLevel === 'chief_accountant') {
      return canApproveStandard;
    }
    if (currentStep === 1 && approvalLevel === 'executive') {
      return canApproveStandard;
    }
    if (currentStep === 2 && approvalLevel === 'executive') {
      return canApproveHigh;
    }

    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{error || 'Request not found'}</h1>
        <Link
          href="/accounting/my-requests"
          className="text-purple-600 hover:text-purple-700"
        >
          ← Back to My Requests
        </Link>
      </div>
    );
  }

  const slaStatus = getSlaStatus(request.slaDeadline || null, request.status);
  const showApprovalInfo = request.requestType === 'payment' && request.amount;
  const approvalLevel = showApprovalInfo ? getRequiredApprovalLevel(request.amount!) : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/accounting/my-requests"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{request.requestNumber}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(request.status)}`}>
                {getStatusLabelTranslated(request.status)}
              </span>
              {request.priority === 'urgent' && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor('urgent')}`}>
                  {getPriorityLabelTranslated('urgent')}
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">{request.title}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canEdit && (
            <Link
              href={`/accounting/requests/${requestId}/edit`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Edit size={16} />
              Edit
            </Link>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <X size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRequestTypeColor(request.requestType)}`}>
                {getTypeLabelTranslated(request.requestType)}
              </span>
            </div>

            {/* Type-specific details */}
            {request.requestType === 'reconciliation' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tenant Name</p>
                    <p className="font-medium">{request.tenantName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tenant INN</p>
                    <p className="font-medium">{request.tenantInn}</p>
                  </div>
                </div>
                {request.contractNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Contract Number</p>
                    <p className="font-medium">{request.contractNumber}</p>
                  </div>
                )}
                {(request.contractStartDate || request.contractEndDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Contract Start</p>
                      <p className="font-medium">{request.contractStartDate ? formatDate(request.contractStartDate) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contract End</p>
                      <p className="font-medium">{request.contractEndDate ? formatDate(request.contractEndDate) : '-'}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Period Start</p>
                    <p className="font-medium">{request.reconciliationPeriodStart ? formatDate(request.reconciliationPeriodStart) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Period End</p>
                    <p className="font-medium">{request.reconciliationPeriodEnd ? formatDate(request.reconciliationPeriodEnd) : '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {request.requestType === 'payment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t.accounting.recipientName}</p>
                    <p className="font-medium">{request.recipientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t.accounting.recipientInn}</p>
                    <p className="font-medium">{request.recipientInn || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t.accounting.amount}</p>
                    <p className="font-medium text-lg text-green-600">{formatCurrency(request.amount!)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t.accounting.category}</p>
                    <p className="font-medium">{getCategoryLabelTranslated(request.paymentCategory!)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.accounting.paymentPurpose}</p>
                  <p className="font-medium">{request.paymentPurpose}</p>
                </div>
                {(request.contractNumber || request.invoiceNumber) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{t.accounting.contractNumber}</p>
                      <p className="font-medium">{request.contractNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t.accounting.invoiceNumber}</p>
                      <p className="font-medium">{request.invoiceNumber || '-'}</p>
                    </div>
                  </div>
                )}

                {/* Approval info */}
                {showApprovalInfo && approvalLevel && (
                  <div className={`p-3 rounded-lg ${
                    approvalLevel === 'executive' ? 'bg-orange-50 border border-orange-200' : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <p className={`text-sm ${approvalLevel === 'executive' ? 'text-orange-700' : 'text-yellow-700'}`}>
                      {approvalLevel === 'executive'
                        ? 'Requires Chief Accountant + GM/CEO approval'
                        : 'Requires Chief Accountant approval'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {request.requestType === 'confirmation' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Client Name</p>
                    <p className="font-medium">{request.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Client INN</p>
                    <p className="font-medium">{request.clientInn || '-'}</p>
                  </div>
                </div>
                {(request.expectedAmount || request.expectedDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Expected Amount</p>
                      <p className="font-medium">{request.expectedAmount ? formatCurrency(request.expectedAmount) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Expected Date</p>
                      <p className="font-medium">{request.expectedDate ? formatDate(request.expectedDate) : '-'}</p>
                    </div>
                  </div>
                )}
                {request.invoiceNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Invoice Number</p>
                    <p className="font-medium">{request.invoiceNumber}</p>
                  </div>
                )}

                {/* Response fields (if completed) */}
                {request.confirmationResponse && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Response</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className={`font-medium ${
                          request.confirmationResponse === 'paid' ? 'text-green-600' :
                          request.confirmationResponse === 'partial' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {request.confirmationResponse === 'paid' ? 'Paid' :
                           request.confirmationResponse === 'partial' ? 'Partially Paid' : 'Not Paid'}
                        </p>
                      </div>
                      {request.confirmedAmount && (
                        <div>
                          <p className="text-sm text-gray-500">Confirmed Amount</p>
                          <p className="font-medium">{formatCurrency(request.confirmedAmount)}</p>
                        </div>
                      )}
                    </div>
                    {request.paymentDate && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Payment Date</p>
                        <p className="font-medium">{formatDate(request.paymentDate)}</p>
                      </div>
                    )}
                    {request.responseNotes && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Notes</p>
                        <p className="font-medium">{request.responseNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {request.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-700">{request.notes}</p>
              </div>
            )}
          </div>

          {/* Processing Actions (for accountants) */}
          {canProcess && (request.status === 'pending' || request.status === 'in_progress' || request.status === 'needs_info') && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">{t.accounting.actions}</h3>
              <div className="flex flex-wrap gap-2">
                {request.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <PlayCircle size={16} />
                    {t.accounting.startProcessing}
                  </button>
                )}
                {request.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('needs_info')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      <Info size={16} />
                      {t.accounting.requestInfo}
                    </button>
                    {request.requestType === 'payment' && request.requiresApproval && (
                      <button
                        onClick={() => handleStatusChange('pending_approval')}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} />
                        {t.accounting.sendForApproval}
                      </button>
                    )}
                    {(!request.requiresApproval || request.requestType !== 'payment') && (
                      <button
                        onClick={() => handleStatusChange('completed')}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        {t.accounting.markComplete}
                      </button>
                    )}
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      {t.accounting.reject}
                    </button>
                  </>
                )}
                {request.status === 'needs_info' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <PlayCircle size={16} />
                    {t.accounting.resumeProcessing}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Approval Actions */}
          {request.status === 'pending_approval' && canApproveAtCurrentStep() && (
            <div className="bg-white rounded-xl border border-purple-200 p-6">
              <h3 className="text-sm font-semibold text-purple-900 uppercase tracking-wider mb-4">
                Approval Required
              </h3>
              <p className="text-gray-600 mb-4">
                This request requires your approval.
                {request.currentApprovalStep === 1 && request.approvalLevel === 'executive' && (
                  <span className="block text-sm text-gray-500 mt-1">
                    Step 1 of 2: Chief Accountant review
                  </span>
                )}
                {request.currentApprovalStep === 2 && request.approvalLevel === 'executive' && (
                  <span className="block text-sm text-gray-500 mt-1">
                    Step 2 of 2: Executive approval
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowApproveModal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>
                <button
                  onClick={() => setShowApprovalRejectModal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Approved: Complete action */}
          {canProcess && request.status === 'approved' && (
            <div className="bg-white rounded-xl border border-green-200 p-6">
              <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wider mb-4">
                Approved - Ready to Complete
              </h3>
              <p className="text-gray-600 mb-4">This request has been approved. You can now complete it.</p>
              <button
                onClick={() => handleStatusChange('completed')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={16} />
                Mark Complete
              </button>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Comments
            </h3>

            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No comments yet</p>
            ) : (
              <div className="space-y-4 mb-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-lg ${comment.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.authorName || 'Unknown'}
                      </span>
                      {comment.isInternal && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded">Internal</span>
                      )}
                      <span className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
              />
              <div className="flex items-center justify-between">
                {canProcess && (
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    Internal comment (only visible to accounting team)
                  </label>
                )}
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {submittingComment ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Meta Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Requester</p>
                  <p className="text-sm font-medium">{request.requesterName || 'Unknown'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Entity / Branch</p>
                  <p className="text-sm font-medium">{request.fromEntityName || 'Unknown'}</p>
                  {request.branchName && (
                    <p className="text-xs text-gray-500">{request.branchName}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium">{formatDate(request.createdAt)}</p>
                  <p className="text-xs text-gray-500">{formatRelativeTime(request.createdAt)}</p>
                </div>
              </div>

              {request.assigneeName && (
                <div className="flex items-start gap-3">
                  <User size={18} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Assigned To</p>
                    <p className="text-sm font-medium">{request.assigneeName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SLA Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">SLA Status</h3>
            <div className={`text-center p-4 rounded-lg ${
              slaStatus === 'breached' ? 'bg-red-50' :
              slaStatus === 'warning' ? 'bg-yellow-50' : 'bg-green-50'
            }`}>
              <Clock size={24} className={`mx-auto mb-2 ${getSlaColor(slaStatus)}`} />
              <p className={`font-medium ${getSlaColor(slaStatus)}`}>
                {getSlaRemainingText(request.slaDeadline || null)}
              </p>
              {request.slaDeadline && (
                <p className="text-xs text-gray-500 mt-1">
                  Deadline: {formatDate(request.slaDeadline)}
                </p>
              )}
            </div>
          </div>

          {/* Rejection Info */}
          {request.status === 'rejected' && request.rejectionReason && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <h3 className="text-sm font-semibold text-red-900 uppercase tracking-wider mb-2">Rejected</h3>
              <p className="text-red-700">{request.rejectionReason}</p>
              {request.rejectedAt && (
                <p className="text-xs text-red-500 mt-2">{formatDate(request.rejectedAt)}</p>
              )}
            </div>
          )}

          {/* Cancellation Info */}
          {request.status === 'cancelled' && request.cancellationReason && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Cancelled</h3>
              <p className="text-gray-700">{request.cancellationReason}</p>
              {request.cancelledAt && (
                <p className="text-xs text-gray-500 mt-2">{formatDate(request.cancelledAt)}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cancel Request</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Why are you cancelling this request?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Keep Request
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal (for processing) */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reject Request</h3>
                <p className="text-sm text-gray-500">Provide a reason for rejection</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Why is this request being rejected?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange('rejected', rejectReason)}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Approve Request</h3>
                <p className="text-sm text-gray-500">
                  {request?.approvalLevel === 'executive' && request?.currentApprovalStep === 1
                    ? 'This will send for executive approval'
                    : 'This will approve the request'}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments (optional)
              </label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                rows={3}
                placeholder="Any comments about this approval..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Reject Modal */}
      {showApprovalRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reject Approval</h3>
                <p className="text-sm text-gray-500">Provide a reason for rejection</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={approvalRejectReason}
                onChange={(e) => setApprovalRejectReason(e.target.value)}
                rows={3}
                placeholder="Why is this approval being rejected?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApprovalRejectModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalReject}
                disabled={!approvalRejectReason.trim() || actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
