'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Building2, User, MapPin } from 'lucide-react';
import type { ClientOption } from './ClientAutocomplete';
import { useServiceHub } from '@/contexts/ServiceHubContext';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  branchId?: string;
  onCreated: (client: ClientOption) => void;
}

const INDUSTRIES = [
  { value: 'it', label: 'IT & Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'services', label: 'Professional Services' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'logistics', label: 'Logistics & Transport' },
  { value: 'other', label: 'Other' },
];

export function CreateClientModal({
  isOpen,
  onClose,
  initialName,
  branchId,
  onCreated,
}: CreateClientModalProps) {
  const { accessibleBranches } = useServiceHub();
  const [formData, setFormData] = useState({
    name: '',
    type: 'individual' as 'company' | 'individual',
    phone: '',
    companyName: '',
    industry: '',
  });
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out "All Branches" option - we need a specific branch for clients
  const availableBranches = accessibleBranches.filter(b => !b.isAllBranches);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialName || '',
        type: 'individual',
        phone: '',
        companyName: '',
        industry: '',
      });
      // Set default branch: use prop, or first available branch
      setSelectedBranch(branchId || (availableBranches.length > 0 ? availableBranches[0].id : ''));
      setErrors({});
    }
  }, [isOpen, initialName, branchId, availableBranches.length]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!selectedBranch) newErrors.branch = 'Please select a branch';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reception/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          phone: formData.phone.trim() || undefined,
          companyName: formData.type === 'individual' ? formData.companyName.trim() || undefined : undefined,
          industry: formData.industry || undefined,
          branchId: selectedBranch,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setErrors({ name: 'A client with this name already exists' });
        } else {
          // Show detailed error if available
          const errorMsg = data.details
            ? (Array.isArray(data.details) ? data.details.join(', ') : data.details)
            : (data.error || 'Failed to create client');
          setErrors({ submit: errorMsg });
        }
        return;
      }

      const client = await response.json();
      onCreated({
        id: client.id,
        name: client.name,
        type: client.type,
        phone: client.phone,
        companyName: client.companyName,
        industry: client.industry,
      });
    } catch (error) {
      setErrors({ submit: 'Failed to create client' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Client" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        {/* Client Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Client Type *</label>
          <div className="flex gap-4">
            <label
              className={`flex-1 flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.type === 'individual'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="type"
                value="individual"
                checked={formData.type === 'individual'}
                onChange={() => setFormData({ ...formData, type: 'individual' })}
                className="sr-only"
              />
              <User className={`w-5 h-5 ${formData.type === 'individual' ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={formData.type === 'individual' ? 'text-green-700 font-medium' : 'text-gray-700'}>
                Individual
              </span>
            </label>
            <label
              className={`flex-1 flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.type === 'company'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="type"
                value="company"
                checked={formData.type === 'company'}
                onChange={() => setFormData({ ...formData, type: 'company' })}
                className="sr-only"
              />
              <Building2 className={`w-5 h-5 ${formData.type === 'company' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={formData.type === 'company' ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                Company
              </span>
            </label>
          </div>
        </div>

        {/* Branch Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Branch *
            </span>
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.branch ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          >
            <option value="">Select branch</option>
            {availableBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} {branch.isAssigned ? '(Your branch)' : ''}
              </option>
            ))}
          </select>
          {errors.branch && (
            <p className="mt-1 text-sm text-red-600">{errors.branch}</p>
          )}
          {availableBranches.length === 0 && (
            <p className="mt-1 text-sm text-amber-600">No branches available. Contact admin to assign you to a branch.</p>
          )}
        </div>

        {/* Name */}
        <Input
          label={formData.type === 'company' ? 'Company Name *' : 'Full Name *'}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={formData.type === 'company' ? 'Enter company name' : 'Enter full name'}
          error={errors.name}
          required
        />

        {/* Phone */}
        <Input
          label="Phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+998 XX XXX XX XX"
        />

        {/* Company Name (for individuals) */}
        {formData.type === 'individual' && (
          <Input
            label="Company / Organization"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="Where do they work?"
            helperText="Optional - helps identify the client"
          />
        )}

        {/* Industry */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
          <select
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select industry (optional)</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind.value} value={ind.value}>
                {ind.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
