'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReceptionMode, getOperatorHeaders } from '@/contexts/ReceptionModeContext';
import type { MaintenanceCategory, MaintenanceUrgency } from '@/modules/maintenance/types';
import { MAINTENANCE_CATEGORY_LABELS, MAINTENANCE_URGENCY_LABELS, URGENCY_COLORS } from '@/modules/maintenance/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Thermometer, Droplets, Zap, Armchair, Sparkles, Building2, Wifi, Shield, MoreHorizontal, ArrowLeft, Upload, X, AlertTriangle } from 'lucide-react';

const CATEGORY_ICONS: Record<MaintenanceCategory, React.ReactNode> = {
  hvac: <Thermometer className="w-6 h-6" />,
  plumbing: <Droplets className="w-6 h-6" />,
  electrical: <Zap className="w-6 h-6" />,
  furniture: <Armchair className="w-6 h-6" />,
  cleaning: <Sparkles className="w-6 h-6" />,
  building: <Building2 className="w-6 h-6" />,
  it_network: <Wifi className="w-6 h-6" />,
  safety: <Shield className="w-6 h-6" />,
  other: <MoreHorizontal className="w-6 h-6" />,
};

const URGENCY_CONFIG: Record<MaintenanceUrgency, { color: string; label: string; sla: string }> = {
  critical: { color: 'red', label: 'Critical', sla: 'Immediate danger or system failure. SLA: 4 hours' },
  high: { color: 'orange', label: 'High', sla: 'Significant impact on operations. SLA: 24 hours' },
  medium: { color: 'yellow', label: 'Medium', sla: 'Moderate inconvenience. SLA: 3 days' },
  low: { color: 'blue', label: 'Low', sla: 'Minor issue, non-urgent. SLA: 7 days' },
};

export default function MaintenanceIssuePage() {
  const router = useRouter();
  const { selectedBranchId, currentOperator } = useReceptionMode();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState<MaintenanceCategory | null>(null);
  const [urgency, setUrgency] = useState<MaintenanceUrgency | null>(null);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!category) {
      newErrors.category = 'Please select a category';
    }
    if (!urgency) {
      newErrors.urgency = 'Please select urgency level';
    }
    if (!location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (files: FileList) => {
    const newFiles = Array.from(files);
    const totalFiles = uploadedFiles.length + newFiles.length;

    if (totalFiles > 5) {
      setErrors((prev) => ({
        ...prev,
        photos: 'Maximum 5 photos allowed',
      }));
      return;
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setErrors((prev) => {
      const { photos, ...rest } = prev;
      return rest;
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!selectedBranchId) {
      setSubmitError('Branch context not available');
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    try {
      const payload = {
        category,
        urgency,
        branchId: selectedBranchId,
        locationDescription: location,
        description,
      };

      const headers = getOperatorHeaders(currentOperator, 'self');

      const response = await fetch('/api/reception/maintenance-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create maintenance issue');
      }

      router.push('/reception/requests/maintenance');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  const categories: MaintenanceCategory[] = ['hvac', 'plumbing', 'electrical', 'furniture', 'cleaning', 'building', 'it_network', 'safety', 'other'];
  const urgencies: MaintenanceUrgency[] = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Report Maintenance Issue</h1>
          </div>
          <p className="text-gray-600 text-sm ml-11">Submit a facility issue for timely resolution</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Alert */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Submission Error</h3>
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            </div>
          )}

          {/* Category Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Category <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    category === cat
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={category === cat ? 'text-purple-600' : 'text-gray-600'}>
                    {CATEGORY_ICONS[cat]}
                  </div>
                  <span className={`text-xs font-medium text-center ${category === cat ? 'text-purple-900' : 'text-gray-700'}`}>
                    {MAINTENANCE_CATEGORY_LABELS[cat]}
                  </span>
                </button>
              ))}
            </div>
            {errors.category && <p className="text-red-600 text-sm mt-2">{errors.category}</p>}
          </div>

          {/* Urgency Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Urgency Level <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              {urgencies.map((urg) => {
                const config = URGENCY_CONFIG[urg];
                const colorMap: Record<string, string> = {
                  red: 'border-red-300 bg-red-50',
                  orange: 'border-orange-300 bg-orange-50',
                  yellow: 'border-yellow-300 bg-yellow-50',
                  blue: 'border-blue-300 bg-blue-50',
                };
                const selectedColorMap: Record<string, string> = {
                  red: 'border-red-500 bg-red-100',
                  orange: 'border-orange-500 bg-orange-100',
                  yellow: 'border-yellow-500 bg-yellow-100',
                  blue: 'border-blue-500 bg-blue-100',
                };

                return (
                  <button
                    key={urg}
                    type="button"
                    onClick={() => setUrgency(urg)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      urgency === urg ? selectedColorMap[config.color] : colorMap[config.color]
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{config.label}</h3>
                    <p className="text-sm text-gray-700">{config.sla}</p>
                  </button>
                );
              })}
            </div>
            {errors.urgency && <p className="text-red-600 text-sm mt-2">{errors.urgency}</p>}
          </div>

          {/* Location Section */}
          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-gray-900 mb-2">
              Location <span className="text-red-600">*</span>
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (errors.location) {
                  setErrors((prev) => {
                    const { location, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              placeholder="e.g., 2nd floor, Room 204, near window"
              className={`w-full px-3 py-2 border ${errors.location ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
            />
            {errors.location && <p className="text-red-600 text-sm mt-1">{errors.location}</p>}
          </div>

          {/* Description Section */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors((prev) => {
                    const { description, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              placeholder="Describe the issue in detail (minimum 20 characters)"
              rows={6}
              className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-red-600 text-sm">{errors.description}</p>
              {!errors.description && (
                <p className="text-gray-500 text-xs">
                  {description.length}/20 minimum
                </p>
              )}
            </div>
          </div>

          {/* Photos Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Photos <span className="text-gray-500 text-xs font-normal">(Optional)</span>
            </label>
            <p className="text-gray-600 text-sm mb-3">Upload up to 5 photos to help us understand the issue better</p>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <input
                type="file"
                id="photos"
                multiple
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
              <label htmlFor="photos" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="text-gray-900 font-medium">Drag and drop photos here</p>
                    <p className="text-gray-600 text-sm">or click to select files</p>
                  </div>
                </div>
              </label>
            </div>

            {errors.photos && <p className="text-red-600 text-sm mt-2">{errors.photos}</p>}

            {/* File Previews */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-gray-200 rounded p-2 flex-shrink-0">
                          <Upload className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-gray-600 text-xs mt-2">
                  {uploadedFiles.length}/5 photos selected
                </p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              isLoading={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit Maintenance Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
