'use client';

import React, { useState, useCallback } from 'react';
import { Calendar, Loader2, Sun, Moon } from 'lucide-react';
import { ShiftPlanningGrid, EmployeeSelector } from '@/components/shifts';
import { Modal } from '@/components/ui';
import Button from '@/components/ui/Button';

interface ShiftsPageClientProps {
  branchFilter?: string;
  canEdit: boolean;
  canPublish: boolean;
}

interface AssignmentModalState {
  open: boolean;
  branchId: string;
  date: string;
  shiftType: 'day' | 'night';
}

interface SelectedEmployee {
  id: string;
  full_name: string;
  position: string;
  is_floater: boolean;
}

export default function ShiftsPageClient({
  branchFilter,
  canEdit,
  canPublish,
}: ShiftsPageClientProps) {
  const [assignmentModal, setAssignmentModal] = useState<AssignmentModalState>({
    open: false,
    branchId: '',
    date: '',
    shiftType: 'day',
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<SelectedEmployee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);

  const handleAssignmentAdd = useCallback((branchId: string, date: string, shiftType: 'day' | 'night') => {
    setSelectedEmployee(null);
    setError(null);
    setAssignmentModal({
      open: true,
      branchId,
      date,
      shiftType,
    });
  }, []);

  const handleAssignmentRemove = useCallback(async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return;

    try {
      const res = await fetch(`/api/shifts/assignments/${assignmentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove assignment');
      }
    } catch (err) {
      alert('Failed to remove assignment');
    }
  }, []);

  const handlePublish = useCallback((scheduleId: string) => {
    // Refresh grid after publish
    setRefreshKey((k) => k + 1);
  }, []);

  // Track current schedule ID from grid
  const handleScheduleChange = useCallback((scheduleId: string | null) => {
    setCurrentScheduleId(scheduleId);
  }, []);

  const closeModal = () => {
    setAssignmentModal((s) => ({ ...s, open: false }));
    setSelectedEmployee(null);
    setError(null);
  };

  const handleSubmitAssignment = async () => {
    if (!selectedEmployee || !currentScheduleId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/shifts/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: currentScheduleId,
          branch_id: assignmentModal.branchId,
          date: assignmentModal.date,
          shift_type: assignmentModal.shiftType,
          employee_id: selectedEmployee.id,
        }),
      });

      if (res.ok) {
        closeModal();
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create assignment');
      }
    } catch (err) {
      setError('Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Calendar className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Planning</h1>
          <p className="text-sm text-gray-500">
            {branchFilter ? 'Manage your branch schedule' : 'Plan and manage shifts across all branches'}
          </p>
        </div>
      </div>

      {/* Grid */}
      <ShiftPlanningGrid
        key={refreshKey}
        branchFilter={branchFilter}
        readonly={!canEdit}
        onAssignmentAdd={canEdit ? handleAssignmentAdd : undefined}
        onAssignmentRemove={canEdit ? handleAssignmentRemove : undefined}
        onPublish={canPublish ? handlePublish : undefined}
        onScheduleChange={handleScheduleChange}
      />

      {/* Assignment Modal */}
      <Modal
        isOpen={assignmentModal.open}
        onClose={closeModal}
        title="Assign Employee to Shift"
      >
        <div className="p-4 space-y-4">
          {/* Shift Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Date:</span>
              <span className="font-medium text-gray-900">
                {formatDateDisplay(assignmentModal.date)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Shift:</span>
              <span className="flex items-center gap-1.5 font-medium">
                {assignmentModal.shiftType === 'day' ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span className="text-gray-900">Day Shift (09:00 - 18:00)</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-indigo-500" />
                    <span className="text-gray-900">Night Shift (18:00 - 09:00)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Employee Selector */}
          {assignmentModal.open && assignmentModal.date && assignmentModal.branchId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee
              </label>
              <EmployeeSelector
                date={assignmentModal.date}
                shiftType={assignmentModal.shiftType}
                branchId={assignmentModal.branchId}
                onSelect={setSelectedEmployee}
                selectedId={selectedEmployee?.id}
              />
            </div>
          )}

          {/* Selected Employee Preview */}
          {selectedEmployee && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-700">
                <span className="font-medium">{selectedEmployee.full_name}</span> will be assigned to this shift.
                {selectedEmployee.is_floater && (
                  <span className="ml-1 text-amber-600">(Floater)</span>
                )}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitAssignment}
              disabled={!selectedEmployee || submitting || !currentScheduleId}
              className="flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign Employee
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
