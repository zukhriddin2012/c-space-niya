'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Users, X, AlertCircle, Check, KeyRound } from 'lucide-react';
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

interface BulkAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  branches: BranchOption[];
}

export function BulkAssignmentModal({ isOpen, onClose, onCreated, branches }: BulkAssignmentModalProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmployeeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [assignedBranchId, setAssignedBranchId] = useState('');
  const [assignmentType, setAssignmentType] = useState<'temporary' | 'regular'>('temporary');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedEmployees([]);
      setSearchQuery('');
      setSearchResults([]);
      setAssignedBranchId('');
      setAssignmentType('temporary');
      setStartsAt(new Date().toISOString().split('T')[0]);
      setEndsAt('');
      setNotes('');
      setError('');
      setResult(null);
    }
  }, [isOpen]);

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
        // Filter out already selected
        const selectedIds = new Set(selectedEmployees.map(e => e.id));
        setSearchResults((data.employees || []).filter((e: EmployeeResult) => !selectedIds.has(e.id)));
      }
    } catch {
      console.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [selectedEmployees]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(searchQuery), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, handleSearch]);

  const addEmployee = (emp: EmployeeResult) => {
    if (selectedEmployees.length >= 20) return;
    setSelectedEmployees(prev => [...prev, emp]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeEmployee = (id: string) => {
    setSelectedEmployees(prev => prev.filter(e => e.id !== id));
  };

  const handleSubmit = async () => {
    if (selectedEmployees.length === 0 || !assignedBranchId) return;
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/reception/admin/branch-assignments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: selectedEmployees.map(e => e.id),
          assignedBranchId,
          assignmentType,
          startsAt: startsAt || undefined,
          endsAt: endsAt || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create assignments');
        return;
      }

      const data = await response.json();
      setResult({ created: data.created?.length || 0, skipped: data.skipped?.length || 0 });

      if (data.created?.length > 0) {
        onCreated();
      }
    } catch {
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Branch Assignment" size="md">
      <div className="space-y-4">
        {result ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-medium text-gray-900">
              {result.created} assignment{result.created !== 1 ? 's' : ''} created
            </p>
            {result.skipped > 0 && (
              <p className="text-sm text-amber-600">
                {result.skipped} skipped (no PIN, already assigned, or same branch)
              </p>
            )}
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            {/* Branch Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Branch</label>
              <select
                value={assignedBranchId}
                onChange={(e) => setAssignedBranchId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select branch...</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Selected Employees Chips */}
            {selectedEmployees.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedEmployees.map(emp => (
                  <span
                    key={emp.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {emp.name}
                    <button onClick={() => removeEmployee(emp.id)} className="hover:text-purple-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <span className="text-xs text-gray-400 self-center">
                  {selectedEmployees.length}/20
                </span>
              </div>
            )}

            {/* Employee Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={selectedEmployees.length >= 20}
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-3">
                <div className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full" />
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {searchResults.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => addEmployee(emp)}
                    className="w-full flex items-center gap-3 p-2 text-left rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 font-medium text-gray-900">{emp.name}</span>
                    <span className="text-xs text-gray-500">{emp.branchName}</span>
                    {emp.hasPinSet ? (
                      <KeyRound className="w-3 h-3 text-green-500" />
                    ) : (
                      <span className="text-xs text-red-500">No PIN</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Type + Dates */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value as 'temporary' | 'regular')}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="temporary">Temporary</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
              <Input label="Starts" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              <Input label="Ends" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedEmployees.length === 0 || !assignedBranchId}
              >
                {isSubmitting ? 'Creating...' : `Assign ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
