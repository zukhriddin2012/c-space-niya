'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Users, Check, KeyRound, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { BranchOption } from '@/modules/reception/types';

interface EmployeeResult {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  role: string;
  hasPinSet: boolean;
}

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  branches: BranchOption[];
}

type AssignmentTypeOption = 'temporary' | 'regular' | 'permanent_transfer';

const typeCards: Array<{ value: AssignmentTypeOption; label: string; desc: string; color: string }> = [
  { value: 'temporary', label: 'Temporary', desc: 'Short-term coverage (e.g., vacation)', color: 'blue' },
  { value: 'regular', label: 'Regular', desc: 'Ongoing multi-branch role', color: 'amber' },
  { value: 'permanent_transfer', label: 'Transfer', desc: 'Permanent move to new branch', color: 'pink' },
];

export function CreateAssignmentModal({ isOpen, onClose, onCreated, branches }: CreateAssignmentModalProps) {
  const [step, setStep] = useState<'employee' | 'details'>('employee');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmployeeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeResult | null>(null);
  const [assignedBranchId, setAssignedBranchId] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentTypeOption>('temporary');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const resetState = () => {
    setStep('employee');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedEmployee(null);
    setAssignedBranchId('');
    setAssignmentType('temporary');
    setStartsAt('');
    setEndsAt('');
    setNotes('');
    setError('');
  };

  useEffect(() => {
    if (!isOpen) resetState();
  }, [isOpen]);

  // Default startsAt to today
  useEffect(() => {
    if (!startsAt) {
      setStartsAt(new Date().toISOString().split('T')[0]);
    }
  }, [startsAt]);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/reception/admin/branch-assignments/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.employees || []);
      } else {
        console.error('Employee search failed:', response.status);
      }
    } catch {
      console.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(searchQuery), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, handleSearch]);

  const handleSelectEmployee = (emp: EmployeeResult) => {
    setSelectedEmployee(emp);
    setStep('details');
    // Auto-select first branch that isn't the employee's home branch
    if (!assignedBranchId) {
      const firstOther = branches.find(b => b.id !== emp.branchId);
      if (firstOther) setAssignedBranchId(firstOther.id);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || !assignedBranchId) return;
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/reception/admin/branch-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          assignedBranchId,
          assignmentType,
          startsAt: startsAt || undefined,
          endsAt: endsAt || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create assignment');
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Branch Assignment" size="md">
      <div className="space-y-4">
        {/* Step 1: Select Employee */}
        {step === 'employee' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full" />
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {searchResults.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.branchName} • {emp.role}</p>
                    </div>
                    {emp.hasPinSet ? (
                      <KeyRound className="w-4 h-4 text-green-500" />
                    ) : (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No PIN
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-center text-gray-500 py-4 text-sm">No employees found</p>
            )}
          </>
        )}

        {/* Step 2: Assignment Details */}
        {step === 'details' && selectedEmployee && (
          <>
            {/* Selected Employee */}
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{selectedEmployee.name}</p>
                <p className="text-sm text-gray-500">{selectedEmployee.branchName} • {selectedEmployee.role}</p>
              </div>
              <button onClick={() => setStep('employee')} className="text-sm text-purple-600 hover:underline">
                Change
              </button>
            </div>

            {/* Assign to Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Branch</label>
              <select
                value={assignedBranchId}
                onChange={(e) => setAssignedBranchId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select branch...</option>
                {branches.filter(b => b.id !== selectedEmployee.branchId).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Assignment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type</label>
              <div className="grid grid-cols-3 gap-2">
                {typeCards.map(tc => (
                  <button
                    key={tc.value}
                    onClick={() => setAssignmentType(tc.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      assignmentType === tc.value
                        ? `border-${tc.color}-500 bg-${tc.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      {assignmentType === tc.value && <Check className="w-3 h-3" />}
                      {tc.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{tc.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Starts At"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <Input
                label="Ends At (optional)"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Covers for vacation"
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !assignedBranchId}>
                {isSubmitting ? 'Creating...' : 'Create Assignment'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
