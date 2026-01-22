'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
  User,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  PAYMENT_CATEGORIES,
  APPROVAL_THRESHOLDS,
} from '@/modules/accounting/lib/constants';
import { formatCurrency, getRequiredApprovalLevel } from '@/modules/accounting/lib/utils';
import type {
  AccountingRequestType,
  RequestPriority,
  PaymentCategory,
  CreateReconciliationInput,
  CreatePaymentInput,
  CreateConfirmationInput,
} from '@/modules/accounting/types';

interface Branch {
  id: string;
  name: string;
}

interface LegalEntity {
  id: string;
  name: string;
  short_name: string | null;
  inn: string | null;
}

const REQUEST_TYPES: { value: AccountingRequestType; label: string; labelRu: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'reconciliation',
    label: 'Reconciliation',
    labelRu: 'Акт сверки',
    icon: <FileText className="text-blue-500" size={24} />,
    description: 'Request reconciliation statement from tenant',
  },
  {
    value: 'payment',
    label: 'Payment',
    labelRu: 'Оплата',
    icon: <DollarSign className="text-green-500" size={24} />,
    description: 'Request payment to vendor/contractor',
  },
  {
    value: 'confirmation',
    label: 'Payment Confirmation',
    labelRu: 'Подтверждение оплаты',
    icon: <CheckCircle className="text-purple-500" size={24} />,
    description: 'Check if client payment was received',
  },
];

export default function NewAccountingRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data for dropdowns
  const [branches, setBranches] = useState<Branch[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [step, setStep] = useState<1 | 2>(1);
  const [requestType, setRequestType] = useState<AccountingRequestType | null>(null);
  const [priority, setPriority] = useState<RequestPriority>('normal');
  const [fromEntityId, setFromEntityId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');

  // Reconciliation fields
  const [tenantName, setTenantName] = useState('');
  const [tenantInn, setTenantInn] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [reconciliationPeriodStart, setReconciliationPeriodStart] = useState('');
  const [reconciliationPeriodEnd, setReconciliationPeriodEnd] = useState('');

  // Payment fields
  const [recipientName, setRecipientName] = useState('');
  const [recipientInn, setRecipientInn] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory | ''>('');
  const [paymentPurpose, setPaymentPurpose] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Confirmation fields
  const [clientName, setClientName] = useState('');
  const [clientInn, setClientInn] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  // Check permission
  const canCreate = user && hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_CREATE);

  // Fetch reference data
  useEffect(() => {
    async function fetchData() {
      try {
        const [branchesRes, entitiesRes] = await Promise.all([
          fetch('/api/branches'),
          fetch('/api/legal-entities'),
        ]);

        if (branchesRes.ok) {
          const data = await branchesRes.json();
          setBranches(data.branches || data || []);
        }

        if (entitiesRes.ok) {
          const data = await entitiesRes.json();
          setLegalEntities(data.entities || []);
        }
      } catch (err) {
        console.error('Error fetching reference data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, []);

  // Auto-set default entity and branch if user has one
  useEffect(() => {
    if (legalEntities.length === 1 && !fromEntityId) {
      setFromEntityId(legalEntities[0].id);
    }
  }, [legalEntities, fromEntityId]);

  const handleSelectType = (type: AccountingRequestType) => {
    setRequestType(type);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      // Reset type-specific fields when going back
      resetTypeFields();
    } else {
      router.back();
    }
  };

  const resetTypeFields = () => {
    // Reconciliation
    setTenantName('');
    setTenantInn('');
    setContractNumber('');
    setContractStartDate('');
    setContractEndDate('');
    setReconciliationPeriodStart('');
    setReconciliationPeriodEnd('');
    // Payment
    setRecipientName('');
    setRecipientInn('');
    setAmount('');
    setPaymentCategory('');
    setPaymentPurpose('');
    setInvoiceNumber('');
    // Confirmation
    setClientName('');
    setClientInn('');
    setExpectedAmount('');
    setExpectedDate('');
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!fromEntityId) errors.push('Please select a legal entity');

    if (requestType === 'reconciliation') {
      if (!tenantName.trim()) errors.push('Tenant name is required');
      if (!tenantInn.trim()) errors.push('Tenant INN is required');
      if (!reconciliationPeriodStart) errors.push('Reconciliation period start is required');
      if (!reconciliationPeriodEnd) errors.push('Reconciliation period end is required');
      if (reconciliationPeriodStart && reconciliationPeriodEnd && reconciliationPeriodStart > reconciliationPeriodEnd) {
        errors.push('Period start must be before period end');
      }
    }

    if (requestType === 'payment') {
      if (!recipientName.trim()) errors.push('Recipient name is required');
      if (!amount || parseFloat(amount) <= 0) errors.push('Valid amount is required');
      if (!paymentCategory) errors.push('Payment category is required');
      if (!paymentPurpose.trim()) errors.push('Payment purpose is required');
    }

    if (requestType === 'confirmation') {
      if (!clientName.trim()) errors.push('Client name is required');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let body: CreateReconciliationInput | CreatePaymentInput | CreateConfirmationInput;

      if (requestType === 'reconciliation') {
        body = {
          requestType: 'reconciliation',
          fromEntityId,
          branchId: branchId || undefined as any,
          priority,
          tenantName: tenantName.trim(),
          tenantInn: tenantInn.trim(),
          contractNumber: contractNumber.trim() || undefined,
          contractStartDate: contractStartDate || undefined,
          contractEndDate: contractEndDate || undefined,
          reconciliationPeriodStart,
          reconciliationPeriodEnd,
          notes: notes.trim() || undefined,
        };
      } else if (requestType === 'payment') {
        body = {
          requestType: 'payment',
          fromEntityId,
          branchId: branchId || undefined as any,
          priority,
          recipientName: recipientName.trim(),
          recipientInn: recipientInn.trim() || undefined,
          amount: parseFloat(amount),
          paymentCategory: paymentCategory as PaymentCategory,
          paymentPurpose: paymentPurpose.trim(),
          contractNumber: contractNumber.trim() || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        };
      } else {
        body = {
          requestType: 'confirmation',
          fromEntityId,
          branchId: branchId || undefined as any,
          priority,
          clientName: clientName.trim(),
          clientInn: clientInn.trim() || undefined,
          expectedAmount: expectedAmount ? parseFloat(expectedAmount) : undefined,
          expectedDate: expectedDate || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        };
      }

      const response = await fetch('/api/accounting/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.details?.join('. ') || 'Failed to create request');
      }

      const data = await response.json();
      router.push(`/accounting/requests/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  // Calculate approval info for payment requests
  const paymentAmount = parseFloat(amount) || 0;
  const approvalLevel = requestType === 'payment' ? getRequiredApprovalLevel(paymentAmount) : null;

  if (!canCreate) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-4">You don't have permission to create accounting requests.</p>
        <Link
          href="/accounting/my-requests"
          className="text-purple-600 hover:text-purple-700"
        >
          ← Back to My Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Accounting Request</h1>
          <p className="text-gray-500 mt-1">
            {step === 1 ? 'Select request type' : `Create ${REQUEST_TYPES.find(t => t.value === requestType)?.label} request`}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Select Request Type */}
      {step === 1 && (
        <div className="space-y-4">
          {REQUEST_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleSelectType(type.value)}
              className="w-full p-6 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-md transition-all text-left flex items-start gap-4 group"
            >
              <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-purple-50 transition-colors">
                {type.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                  {type.label}
                  <span className="ml-2 text-sm font-normal text-gray-500">/ {type.labelRu}</span>
                </h3>
                <p className="text-gray-500 mt-1">{type.description}</p>
              </div>
              <div className="text-gray-300 group-hover:text-purple-400 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Request Form */}
      {step === 2 && requestType && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Common Fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              General Information
            </h3>

            <div className="space-y-4">
              {/* Legal Entity Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Entity <span className="text-red-500">*</span>
                </label>
                <select
                  value={fromEntityId}
                  onChange={(e) => setFromEntityId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  required
                  disabled={loadingData}
                >
                  <option value="">Select legal entity...</option>
                  {legalEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.short_name || entity.name}
                      {entity.inn && ` (INN: ${entity.inn})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  disabled={loadingData}
                >
                  <option value="">No specific branch (HQ)</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    priority === 'normal' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="priority"
                      value="normal"
                      checked={priority === 'normal'}
                      onChange={(e) => setPriority(e.target.value as RequestPriority)}
                      className="text-purple-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Normal</span>
                      <span className="text-xs text-gray-500 block">SLA: 3 business days</span>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    priority === 'urgent' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="priority"
                      value="urgent"
                      checked={priority === 'urgent'}
                      onChange={(e) => setPriority(e.target.value as RequestPriority)}
                      className="text-red-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Urgent</span>
                      <span className="text-xs text-gray-500 block">SLA: 1 business day</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Reconciliation Fields */}
          {requestType === 'reconciliation' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Reconciliation Details
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Company or individual name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant INN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tenantInn}
                      onChange={(e) => setTenantInn(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Tax ID number"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Number
                  </label>
                  <input
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    placeholder="Contract reference number"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Start Date
                    </label>
                    <input
                      type="date"
                      value={contractStartDate}
                      onChange={(e) => setContractStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract End Date
                    </label>
                    <input
                      type="date"
                      value={contractEndDate}
                      onChange={(e) => setContractEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Period Start <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={reconciliationPeriodStart}
                      onChange={(e) => setReconciliationPeriodStart(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Period End <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={reconciliationPeriodEnd}
                      onChange={(e) => setReconciliationPeriodEnd(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Fields */}
          {requestType === 'payment' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-green-500" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Payment Details
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Vendor/contractor name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient INN
                    </label>
                    <input
                      type="text"
                      value={recipientInn}
                      onChange={(e) => setRecipientInn(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Tax ID number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (UZS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Enter amount"
                      min="1"
                      step="1000"
                      required
                    />
                    {paymentAmount > 0 && (
                      <p className="text-sm text-gray-500 mt-1">{formatCurrency(paymentAmount)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={paymentCategory}
                      onChange={(e) => setPaymentCategory(e.target.value as PaymentCategory)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      required
                    >
                      <option value="">Select category...</option>
                      {Object.entries(PAYMENT_CATEGORIES).map(([key, labels]) => (
                        <option key={key} value={key}>
                          {labels.en} / {labels.ru}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Approval Info */}
                {paymentAmount > 0 && (
                  <div className={`p-4 rounded-lg ${
                    approvalLevel === 'executive'
                      ? 'bg-orange-50 border border-orange-200'
                      : approvalLevel === 'chief_accountant'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <Info size={18} className={
                        approvalLevel === 'executive'
                          ? 'text-orange-600'
                          : approvalLevel === 'chief_accountant'
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      } />
                      <div className="text-sm">
                        {approvalLevel === 'executive' && (
                          <>
                            <p className="font-medium text-orange-800">Executive Approval Required</p>
                            <p className="text-orange-700 mt-1">
                              Amount ≥ {formatCurrency(APPROVAL_THRESHOLDS.HIGH)} requires Chief Accountant + GM/CEO approval.
                            </p>
                          </>
                        )}
                        {approvalLevel === 'chief_accountant' && (
                          <>
                            <p className="font-medium text-yellow-800">Chief Accountant Approval Required</p>
                            <p className="text-yellow-700 mt-1">
                              Amount {formatCurrency(APPROVAL_THRESHOLDS.STANDARD)} - {formatCurrency(APPROVAL_THRESHOLDS.HIGH)} requires Chief Accountant approval.
                            </p>
                          </>
                        )}
                        {!approvalLevel && (
                          <>
                            <p className="font-medium text-green-800">No Approval Required</p>
                            <p className="text-green-700 mt-1">
                              Amount under {formatCurrency(APPROVAL_THRESHOLDS.STANDARD)} can be processed directly.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Purpose <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={paymentPurpose}
                    onChange={(e) => setPaymentPurpose(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                    placeholder="Describe what this payment is for..."
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Number
                    </label>
                    <input
                      type="text"
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Reference contract"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Invoice reference"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Fields */}
          {requestType === 'confirmation' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Payment Confirmation Details
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Client/tenant name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client INN
                    </label>
                    <input
                      type="text"
                      value={clientInn}
                      onChange={(e) => setClientInn(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Tax ID number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Amount (UZS)
                    </label>
                    <input
                      type="number"
                      value={expectedAmount}
                      onChange={(e) => setExpectedAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="Expected payment amount"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Date
                    </label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    placeholder="Invoice reference"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Additional Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
              placeholder="Any additional information for the accounting team..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
