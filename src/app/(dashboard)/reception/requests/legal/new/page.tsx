'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSignature,
  FilePen,
  FileX2,
  Globe,
  FileCheck,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useReceptionMode, getOperatorHeaders } from '@/contexts/ReceptionModeContext';
import type {
  LegalRequestType,
  ContractTypeCode,
  PaymentForm,
  PaymentPeriod,
  ChangeType,
  ContractPreparationMetadata,
  SupplementaryAgreementMetadata,
  ContractTerminationMetadata,
  WebsiteRegistrationMetadata,
  GuaranteeLetterMetadata,
} from '@/modules/legal/types';
import {
  LEGAL_REQUEST_TYPE_LABELS,
  CONTRACT_TYPE_LABELS,
} from '@/modules/legal/types';

// Type selector card definitions
interface RequestTypeCard {
  type: LegalRequestType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const REQUEST_TYPE_CARDS: RequestTypeCard[] = [
  {
    type: 'contract_preparation',
    label: 'Contract Preparation',
    description: 'Prepare a new contract for a client',
    icon: <FileSignature className="w-6 h-6" />,
  },
  {
    type: 'supplementary_agreement',
    label: 'Supplementary Agreement',
    description: 'Modify terms of an existing contract',
    icon: <FilePen className="w-6 h-6" />,
  },
  {
    type: 'contract_termination',
    label: 'Contract Termination',
    description: 'Terminate an existing contract',
    icon: <FileX2 className="w-6 h-6" />,
  },
  {
    type: 'website_registration',
    label: 'Website Registration',
    description: 'Register a company on the website',
    icon: <Globe className="w-6 h-6" />,
  },
  {
    type: 'guarantee_letter',
    label: 'Guarantee Letter',
    description: 'Issue a guarantee letter',
    icon: <FileCheck className="w-6 h-6" />,
  },
];

export default function NewLegalRequestPage() {
  const router = useRouter();
  const { selectedBranchId, currentOperator } = useReceptionMode();

  // UI state
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<LegalRequestType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form data state
  const [contractPrepFormData, setContractPrepFormData] = useState<Partial<ContractPreparationMetadata>>({
    contractType: 'А',
    paymentForm: 'wire',
    serviceCost: 0,
    paymentPeriod: 'monthly',
    startDate: '',
    endDate: '',
    registrationRequired: false,
  });

  const [supplementaryFormData, setSupplementaryFormData] = useState<Partial<SupplementaryAgreementMetadata>>({
    changeType: 'discount',
    changeDescription: '',
    effectiveDate: '',
  });

  const [terminationFormData, setTerminationFormData] = useState<Partial<ContractTerminationMetadata>>({
    terminationDate: '',
    hasDebt: false,
  });

  const [websiteFormData, setWebsiteFormData] = useState<Partial<WebsiteRegistrationMetadata>>({
    companyName: '',
    inn: '',
    branchName: '',
    registrationPeriod: '',
    phone: '',
    monthlyAmount: 0,
    paymentStatus: '',
    contractNumber: '',
  });

  const [guaranteeFormData, setGuaranteeFormData] = useState<Partial<GuaranteeLetterMetadata>>({
    futureCompanyName: '',
    directorFullName: '',
    requiredAreaSqm: 0,
  });

  // Handle type selection
  const handleTypeSelect = (type: LegalRequestType) => {
    setSelectedType(type);
    setSubmitError(null);
    setStep(2);
  };

  // Handle back button
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedType(null);
      setSubmitError(null);
    } else {
      router.push('/reception/requests/legal');
    }
  };

  // Validate form based on type
  const validateForm = (): boolean => {
    if (!selectedType) return false;

    switch (selectedType) {
      case 'contract_preparation': {
        const data = contractPrepFormData as ContractPreparationMetadata;
        return !!(
          data.contractType &&
          data.paymentForm &&
          data.serviceCost > 0 &&
          data.paymentPeriod &&
          data.startDate &&
          data.endDate
        );
      }
      case 'supplementary_agreement': {
        const data = supplementaryFormData as SupplementaryAgreementMetadata;
        return !!(data.changeType && data.changeDescription && data.effectiveDate);
      }
      case 'contract_termination': {
        const data = terminationFormData as ContractTerminationMetadata;
        if (!data.terminationDate) return false;
        if (data.hasDebt && !data.debtAmount) return false;
        return true;
      }
      case 'website_registration': {
        const data = websiteFormData as WebsiteRegistrationMetadata;
        return !!(
          data.companyName &&
          data.inn &&
          data.branchName &&
          data.registrationPeriod &&
          data.phone &&
          data.monthlyAmount > 0 &&
          data.paymentStatus &&
          data.contractNumber
        );
      }
      case 'guarantee_letter': {
        const data = guaranteeFormData as GuaranteeLetterMetadata;
        return !!(
          data.futureCompanyName &&
          data.directorFullName &&
          data.requiredAreaSqm > 0
        );
      }
      default:
        return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType || !selectedBranchId) {
      setSubmitError('Missing required information');
      return;
    }

    if (!validateForm()) {
      setSubmitError('Please fill out all required fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let metadata: Record<string, unknown> = {};

      switch (selectedType) {
        case 'contract_preparation':
          metadata = contractPrepFormData;
          break;
        case 'supplementary_agreement':
          metadata = supplementaryFormData;
          break;
        case 'contract_termination':
          metadata = terminationFormData;
          break;
        case 'website_registration':
          metadata = websiteFormData;
          break;
        case 'guarantee_letter':
          metadata = guaranteeFormData;
          break;
      }

      const headers = {
        'Content-Type': 'application/json',
        ...getOperatorHeaders(currentOperator, 'user-id'),
      };

      const response = await fetch('/api/reception/legal-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requestType: selectedType,
          branchId: selectedBranchId,
          metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to create legal request: ${response.status}`
        );
      }

      const result = await response.json();
      router.push('/reception/requests/legal');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create legal request';
      setSubmitError(errorMessage);
      console.error('Error submitting legal request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Legal Request</h1>
            <p className="text-gray-500 mt-2">
              {step === 1
                ? 'Select the type of legal request you want to submit'
                : `Complete the form for ${selectedType ? LEGAL_REQUEST_TYPE_LABELS[selectedType] : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Request Type Selector */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {REQUEST_TYPE_CARDS.map(card => (
              <button
                key={card.type}
                onClick={() => handleTypeSelect(card.type)}
                className="group"
              >
                <Card className="h-full cursor-pointer transition-all border-2 border-transparent hover:border-purple-500 hover:shadow-lg group-hover:bg-purple-50">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="text-purple-600 group-hover:text-purple-700">
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{card.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{card.description}</p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Form based on selected type */}
      {step === 2 && selectedType && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {submitError && (
            <Card className="bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{submitError}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Contract Preparation Form */}
          {selectedType === 'contract_preparation' && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Contract Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contract Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={contractPrepFormData.contractType || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          contractType: e.target.value as ContractTypeCode,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select contract type</option>
                      {Object.entries(CONTRACT_TYPE_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Form */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Form <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={contractPrepFormData.paymentForm || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          paymentForm: e.target.value as PaymentForm,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select payment form</option>
                      <option value="wire">Wire Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="usd">USD</option>
                    </select>
                  </div>

                  {/* Service Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Cost (UZS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={contractPrepFormData.serviceCost || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          serviceCost: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {/* Payment Period */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Period <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={contractPrepFormData.paymentPeriod || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          paymentPeriod: e.target.value as PaymentPeriod,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select payment period</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="prepaid">Prepaid</option>
                      <option value="one_time">One Time</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={contractPrepFormData.startDate || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={contractPrepFormData.endDate || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Area sqm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area (sqm)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={contractPrepFormData.areaSqm || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          areaSqm: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Office Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Office Number
                    </label>
                    <input
                      type="text"
                      value={contractPrepFormData.officeNumber || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          officeNumber: e.target.value || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Workstations */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Workstations
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={contractPrepFormData.workstations || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          workstations: parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Tariff */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tariff
                    </label>
                    <input
                      type="text"
                      value={contractPrepFormData.tariff || ''}
                      onChange={e =>
                        setContractPrepFormData({
                          ...contractPrepFormData,
                          tariff: e.target.value || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Registration Required Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="registrationRequired"
                    checked={contractPrepFormData.registrationRequired || false}
                    onChange={e =>
                      setContractPrepFormData({
                        ...contractPrepFormData,
                        registrationRequired: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <label
                    htmlFor="registrationRequired"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    Registration Required
                  </label>
                </div>

                {/* Additional Conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Conditions
                  </label>
                  <textarea
                    value={contractPrepFormData.additionalConditions || ''}
                    onChange={e =>
                      setContractPrepFormData({
                        ...contractPrepFormData,
                        additionalConditions: e.target.value || undefined,
                      })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter any additional conditions or notes"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Supplementary Agreement Form */}
          {selectedType === 'supplementary_agreement' && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Supplementary Agreement Details</h2>

                <div className="space-y-6">
                  {/* Change Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Change Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={supplementaryFormData.changeType || ''}
                      onChange={e =>
                        setSupplementaryFormData({
                          ...supplementaryFormData,
                          changeType: e.target.value as ChangeType,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select change type</option>
                      <option value="discount">Discount</option>
                      <option value="area">Area</option>
                      <option value="office">Office</option>
                      <option value="payment_format">Payment Format</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Change Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Change Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={supplementaryFormData.changeDescription || ''}
                      onChange={e =>
                        setSupplementaryFormData({
                          ...supplementaryFormData,
                          changeDescription: e.target.value,
                        })
                      }
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Describe the changes to be made"
                    />
                  </div>

                  {/* Effective Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={supplementaryFormData.effectiveDate || ''}
                      onChange={e =>
                        setSupplementaryFormData({
                          ...supplementaryFormData,
                          effectiveDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Contract Termination Form */}
          {selectedType === 'contract_termination' && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Termination Details</h2>

                <div className="space-y-6">
                  {/* Termination Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Termination Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={terminationFormData.terminationDate || ''}
                      onChange={e =>
                        setTerminationFormData({
                          ...terminationFormData,
                          terminationDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Has Debt Checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hasDebt"
                      checked={terminationFormData.hasDebt || false}
                      onChange={e =>
                        setTerminationFormData({
                          ...terminationFormData,
                          hasDebt: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <label
                      htmlFor="hasDebt"
                      className="ml-2 text-sm font-medium text-gray-700"
                    >
                      Contract has outstanding debt
                    </label>
                  </div>

                  {/* Debt Amount (conditional) */}
                  {terminationFormData.hasDebt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Debt Amount (UZS) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={terminationFormData.debtAmount || ''}
                        onChange={e =>
                          setTerminationFormData({
                            ...terminationFormData,
                            debtAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Website Registration Form */}
          {selectedType === 'website_registration' && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Website Registration Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={websiteFormData.companyName || ''}
                      onChange={e =>
                        setWebsiteFormData({
                          ...websiteFormData,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter company name"
                    />
                  </div>

                  {/* INN */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      INN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={websiteFormData.inn || ''}
                      onChange={e =>
                        setWebsiteFormData({
                          ...websiteFormData,
                          inn: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter INN"
                    />
                  </div>

                  {/* Branch Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={websiteFormData.branchName || ''}
                      onChange={e =>
                        setWebsiteFormData({
                          ...websiteFormData,
                          branchName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter branch name"
                    />
                  </div>

                  {/* Registration Period */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Period <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={websiteFormData.registrationPeriod || ''}
                      onChange={e =>
                        setWebsiteFormData({
                          ...websiteFormData,
                          registrationPeriod: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., 12 months"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={websiteFormData.phone || ''}
                      onChange={e =>
                        setWebsiteFormData({
                          ...websiteFormData,
                          phone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* Monthly Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Amount (UZS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={websiteFormData.monthlyAmount || ''}
                      onChange={e =>
                        setWebsiteFormData({
                          ...websiteFormData,
                          monthlyAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={websiteFormData.paymentStatus || ''}
                      onChange={e =>
                        setWebsiteFormData({
                          ...websiteFormData,
                          paymentStatus: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Paid, Pending"
                    />
                  </div>

                  {/* Contract Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={websiteFormData.contractNumber || ''}
                      onChange={e =>
                        setWebsiteFormData({
                          ...websiteFormData,
                          contractNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter contract number"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Guarantee Letter Form */}
          {selectedType === 'guarantee_letter' && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Guarantee Letter Details</h2>

                <div className="space-y-6">
                  {/* Future Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Future Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guaranteeFormData.futureCompanyName || ''}
                      onChange={e =>
                        setGuaranteeFormData({
                          ...guaranteeFormData,
                          futureCompanyName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter company name"
                    />
                  </div>

                  {/* Director Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Director Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guaranteeFormData.directorFullName || ''}
                      onChange={e =>
                        setGuaranteeFormData({
                          ...guaranteeFormData,
                          directorFullName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter director's full name"
                    />
                  </div>

                  {/* Required Area sqm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Area (sqm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={guaranteeFormData.requiredAreaSqm || ''}
                      onChange={e =>
                        setGuaranteeFormData({
                          ...guaranteeFormData,
                          requiredAreaSqm: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Form Actions */}
          <div className="flex gap-4 justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={() => router.push('/reception/requests/legal')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
