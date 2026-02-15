'use client';

import React, { useState } from 'react';
import { AlertTriangle, Users, Building2, ShieldAlert } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { BranchAssignment } from '@/modules/reception/types';

interface EndAssignmentDialogProps {
  isOpen: boolean;
  assignment: BranchAssignment;
  onClose: () => void;
  onConfirm: () => void;
}

export function EndAssignmentDialog({ isOpen, assignment, onClose, onConfirm }: EndAssignmentDialogProps) {
  const [isEnding, setIsEnding] = useState(false);

  const handleConfirm = async () => {
    setIsEnding(true);
    try {
      await onConfirm();
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="End Assignment" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-800 font-medium">Are you sure you want to end this assignment?</p>
            <p className="text-amber-700 mt-1">This action cannot be undone.</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">
              {assignment.employeeName || assignment.employeeId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {assignment.homeBranchName} → {assignment.assignedBranchName}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-gray-500">
          <ShieldAlert className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p>
            If branch access was auto-granted with this assignment, it will be automatically revoked.
            Manually-granted access will not be affected.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={isEnding}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isEnding}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isEnding ? 'Ending...' : 'End Assignment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
