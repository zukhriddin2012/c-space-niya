'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReceptionMode, getOperatorHeaders } from '@/contexts/ReceptionModeContext';
import type { AccountingRequestType } from '@/modules/accounting/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileSearch, CreditCard, CheckCircle2, Receipt, ArrowLeft, Loader2 } from 'lucide-react';

type FormStep = 'select-type' | 'fill-form';

interface ReconciliationForm {
  tenantName: string;
  tenantInn: string;
  contractNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  reconciliationStartDate: string;
  reconciliationEndDate: string;
  notes: string;
}

interface PaymentForm {
  recipientName: string;
  recipientInn: string;
  amount: string;
  paymentCategory: string;
  paymentPurpose: string;
  contractNumber: string;
  invoiceNumber: string;
  notes: string;
}

interface ConfirmationForm {
  clientName: string;
  clientInn: string;
  expectedAmount: string;
  expectedDate: string;
  invoiceNumber: string;
  notes: string;
}

type FormData = ReconciliationForm | PaymentForm | ConfirmationForm;

const typeOptions: Array<{
  type: AccountingRequestType;
  icon: React.ReactNode;
  title: string;
  description: string;
}> = [
  {
    type: 'reconciliation',
    icon: <FileSearch className="w-8 h-8" />,
    title: 'Reconciliation',
    description: 'Request an act of reconciliation with a client',
  },
  {
    type: 'payment',
    icon: <CreditCard className="w-8 h-8" />,
    title: 'Payment',
    description: 'Request a payment to a supplier or vendor',
  },
  {
    type: 'confirmation',
    icon: <CheckCircle2 className="w-8 h-8" />,
    title: 'Confirmation',
    description: 'Confirm a payment was received',
  },
  // TODO: Invoice type to be added in future (currently not in AccountingRequestType)
];

export default function NewAccountingRequestPage() {
  const router = useRouter();
  const { selectedBranchId, currentOperator } = useReceptionMode();
  const [step, setStep] = useState<FormStep>('select-type');
  const [selectedType, setSelectedType] = useState<AccountingRequestType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for each type
  const [reconciliationForm, setReconciliationForm] = useState<ReconciliationForm>({
    tenantName: '',
    tenantInn: '',
    contractNumber: '',
    contractStartDate: '',
    contractEndDate: '',
    reconciliationStartDate: '',
    reconciliationEndDate: '',
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    recipientName: '',
    recipientInn: '',
    amount: '',
    paymentCategory: 'office_supplies',
    paymentPurpose: '',
    contractNumber: '',
    invoiceNumber: '',
    notes: '',
  });

  const [confirmationForm, setConfirmationForm] = useState<ConfirmationForm>({
    clientName: '',
    clientInn: '',
    expectedAmount: '',
    expectedDate: '',
    invoiceNumber: '',
    notes: '',
  });

  const handleTypeSelect = (type: AccountingRequestType) => {
    setSelectedType(type);
    setStep('fill-form');
    setError(null);
  };

  const handleBack = () => {
    if (step === 'fill-form') {
      setStep('select-type');
      setSelectedType(null);
    } else {
      router.back();
    }
  };

  const validateReconciliationForm = (): boolean => {
    if (!reconciliationForm.tenantName.trim()) {
      setError('Tenant Name is required');
      return false;
    }
    if (!reconciliationForm.tenantInn.trim()) {
      setError('Tenant INN is required');
      return false;
    }
    if (!reconciliationForm.reconciliationStartDate) {
      setError('Reconciliation Period Start is required');
      return false;
    }
    if (!reconciliationForm.reconciliationEndDate) {
      setError('Reconciliation Period End is required');
      return false;
    }
    if (new Date(reconciliationForm.reconciliationStartDate) >= new Date(reconciliationForm.reconciliationEndDate)) {
      setError('Start date must be before end date');
      return false;
    }
    return true;
  };

  const validatePaymentForm = (): boolean => {
    if (!paymentForm.recipientName.trim()) {
      setError('Recipient Name is required');
      return false;
    }
    if (!paymentForm.amount.trim()) {
      setError('Amount is required');
      return false;
    }
    if (isNaN(parseFloat(paymentForm.amount)) || parseFloat(paymentForm.amount) <= 0) {
      setError('Amount must be a positive number');
      return false;
    }
    if (!paymentForm.paymentPurpose.trim()) {
      setError('Payment Purpose is required');
      return false;
    }
    return true;
  };

  const validateConfirmationForm = (): boolean => {
    if (!confirmationForm.clientName.trim()) {
      setError('Client Name is required');
      return false;
    }
    if (confirmationForm.expectedAmount && isNaN(parseFloat(confirmationForm.expectedAmount))) {
      setError('Expected Amount must be a valid number');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate based on type
    let isValid = false;
    switch (selectedType) {
      case 'reconciliation':
        isValid = validateReconciliationForm();
        break;
      case 'payment':
        isValid = validatePaymentForm();
        break;
      case 'confirmation':
        isValid = validateConfirmationForm();
        break;
    }

    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      const headers = getOperatorHeaders(currentOperator, 'self');
      let payload: any = {
        type: selectedType,
        branchId: selectedBranchId,
      };

      // Add type-specific data
      switch (selectedType) {
        case 'reconciliation':
          payload = {
            ...payload,
            tenantName: reconciliationForm.tenantName,
            tenantInn: reconciliationForm.tenantInn,
            contractNumber: reconciliationForm.contractNumber || undefined,
            contractStartDate: reconciliationForm.contractStartDate || undefined,
            contractEndDate: reconciliationForm.contractEndDate || undefined,
            reconciliationStartDate: reconciliationForm.reconciliationStartDate,
            reconciliationEndDate: reconciliationForm.reconciliationEndDate,
            notes: reconciliationForm.notes || undefined,
          };
          break;
        case 'payment':
          payload = {
            ...payload,
            recipientName: paymentForm.recipientName,
            recipientInn: paymentForm.recipientInn || undefined,
            amount: parseFloat(paymentForm.amount),
            paymentCategory: paymentForm.paymentCategory,
            paymentPurpose: paymentForm.paymentPurpose,
            contractNumber: paymentForm.contractNumber || undefined,
            invoiceNumber: paymentForm.invoiceNumber || undefined,
            notes: paymentForm.notes || undefined,
          };
          break;
        case 'confirmation':
          payload = {
            ...payload,
            clientName: confirmationForm.clientName,
            clientInn: confirmationForm.clientInn || undefined,
            expectedAmount: confirmationForm.expectedAmount ? parseFloat(confirmationForm.expectedAmount) : undefined,
            expectedDate: confirmationForm.expectedDate || undefined,
            invoiceNumber: confirmationForm.invoiceNumber || undefined,
            notes: confirmationForm.notes || undefined,
          };
          break;
      }

      const response = await fetch('/api/reception/accounting-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create accounting request');
      }

      router.push('/reception/requests/accounting');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Error creating request:', err);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'select-type') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">New Accounting Request</h1>
            <p className="text-gray-600 mt-2">Select the type of request you need to submit</p>
          </div>

          {/* Type Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => handleTypeSelect(option.type)}
                className="text-left"
              >
                <Card className="p-6 h-full hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                      {option.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{option.description}</p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render form based on selected type
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {typeOptions.find((o) => o.type === selectedType)?.title}
          </h1>
          <p className="text-gray-600 mt-2">
            {typeOptions.find((o) => o.type === selectedType)?.description}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 p-4 border-2 border-red-200 bg-red-50">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* Form */}
        <Card className="p-6">
          {selectedType === 'reconciliation' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
              {/* Tenant Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={reconciliationForm.tenantName}
                  onChange={(e) =>
                    setReconciliationForm({ ...reconciliationForm, tenantName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter tenant name"
                />
              </div>

              {/* Tenant INN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant INN <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={reconciliationForm.tenantInn}
                  onChange={(e) =>
                    setReconciliationForm({ ...reconciliationForm, tenantInn: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter tenant INN"
                />
              </div>

              {/* Contract Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract Number</label>
                <input
                  type="text"
                  value={reconciliationForm.contractNumber}
                  onChange={(e) =>
                    setReconciliationForm({ ...reconciliationForm, contractNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter contract number"
                />
              </div>

              {/* Contract Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contract Start Date</label>
                  <input
                    type="date"
                    value={reconciliationForm.contractStartDate}
                    onChange={(e) =>
                      setReconciliationForm({
                        ...reconciliationForm,
                        contractStartDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contract End Date</label>
                  <input
                    type="date"
                    value={reconciliationForm.contractEndDate}
                    onChange={(e) =>
                      setReconciliationForm({
                        ...reconciliationForm,
                        contractEndDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Reconciliation Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reconciliation Period Start <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={reconciliationForm.reconciliationStartDate}
                    onChange={(e) =>
                      setReconciliationForm({
                        ...reconciliationForm,
                        reconciliationStartDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reconciliation Period End <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={reconciliationForm.reconciliationEndDate}
                    onChange={(e) =>
                      setReconciliationForm({
                        ...reconciliationForm,
                        reconciliationEndDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={reconciliationForm.notes}
                  onChange={(e) =>
                    setReconciliationForm({ ...reconciliationForm, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="secondary"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          )}

          {selectedType === 'payment' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
              {/* Recipient Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={paymentForm.recipientName}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, recipientName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter recipient name"
                />
              </div>

              {/* Recipient INN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient INN</label>
                <input
                  type="text"
                  value={paymentForm.recipientInn}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, recipientInn: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter recipient INN"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₽</span>
                </div>
              </div>

              {/* Payment Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Category <span className="text-red-600">*</span>
                </label>
                <select
                  value={paymentForm.paymentCategory}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentCategory: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="office_supplies">Office Supplies</option>
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="services">Services</option>
                  <option value="equipment">Equipment</option>
                  <option value="marketing">Marketing</option>
                  <option value="salary_hr">Salary & HR</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Payment Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Purpose <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={paymentForm.paymentPurpose}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentPurpose: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter payment purpose"
                />
              </div>

              {/* Contract Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract Number</label>
                <input
                  type="text"
                  value={paymentForm.contractNumber}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, contractNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter contract number"
                />
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={paymentForm.invoiceNumber}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, invoiceNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter invoice number"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="secondary"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          )}

          {selectedType === 'confirmation' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={confirmationForm.clientName}
                  onChange={(e) =>
                    setConfirmationForm({ ...confirmationForm, clientName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter client name"
                />
              </div>

              {/* Client INN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client INN</label>
                <input
                  type="text"
                  value={confirmationForm.clientInn}
                  onChange={(e) =>
                    setConfirmationForm({ ...confirmationForm, clientInn: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter client INN"
                />
              </div>

              {/* Expected Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={confirmationForm.expectedAmount}
                    onChange={(e) =>
                      setConfirmationForm({ ...confirmationForm, expectedAmount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter expected amount"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₽</span>
                </div>
              </div>

              {/* Expected Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Date</label>
                <input
                  type="date"
                  value={confirmationForm.expectedDate}
                  onChange={(e) =>
                    setConfirmationForm({ ...confirmationForm, expectedDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={confirmationForm.invoiceNumber}
                  onChange={(e) =>
                    setConfirmationForm({ ...confirmationForm, invoiceNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter invoice number"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={confirmationForm.notes}
                  onChange={(e) =>
                    setConfirmationForm({ ...confirmationForm, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="secondary"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          )}

        </Card>
      </div>
    </div>
  );
}
