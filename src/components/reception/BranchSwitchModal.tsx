'use client';

import { Building2, Globe, ArrowRight, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useServiceHub } from '@/contexts/ServiceHubContext';

export function BranchSwitchModal() {
  const {
    showBranchSwitchConfirm,
    pendingBranchId,
    selectedBranch,
    accessibleBranches,
    confirmBranchSwitch,
    cancelBranchSwitch,
  } = useServiceHub();

  const pendingBranch = accessibleBranches.find(b => b.id === pendingBranchId);

  if (!showBranchSwitchConfirm || !selectedBranch || !pendingBranch) {
    return null;
  }

  const isToAllBranches = pendingBranch.isAllBranches;
  const isFromAllBranches = selectedBranch.isAllBranches;

  return (
    <Modal
      isOpen={showBranchSwitchConfirm}
      onClose={cancelBranchSwitch}
      title="Switch Branch"
      size="md"
    >
      <div className="space-y-4">
        {/* Warning for All Branches */}
        {isToAllBranches && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Executive View</p>
              <p className="text-sm text-amber-700">
                You&apos;ll see combined data from all branches. New transactions and expenses
                will still be recorded to your assigned branch.
              </p>
            </div>
          </div>
        )}

        {/* Branch Switch Visualization */}
        <div className="flex items-center justify-center gap-4 py-4">
          {/* From Branch */}
          <div className={`flex flex-col items-center p-4 rounded-lg ${
            isFromAllBranches ? 'bg-red-50' : 'bg-gray-50'
          }`}>
            {isFromAllBranches ? (
              <Globe className="w-8 h-8 text-red-500 mb-2" />
            ) : (
              <Building2 className="w-8 h-8 text-gray-400 mb-2" />
            )}
            <p className={`text-sm font-medium text-center ${
              isFromAllBranches ? 'text-red-700' : 'text-gray-700'
            }`}>
              {selectedBranch.name}
            </p>
            <p className="text-xs text-gray-400">Current</p>
          </div>

          {/* Arrow */}
          <ArrowRight className="w-6 h-6 text-gray-400" />

          {/* To Branch */}
          <div className={`flex flex-col items-center p-4 rounded-lg ${
            isToAllBranches ? 'bg-red-50' : 'bg-purple-50'
          }`}>
            {isToAllBranches ? (
              <Globe className="w-8 h-8 text-red-500 mb-2" />
            ) : (
              <Building2 className="w-8 h-8 text-purple-500 mb-2" />
            )}
            <p className={`text-sm font-medium text-center ${
              isToAllBranches ? 'text-red-700' : 'text-purple-700'
            }`}>
              {pendingBranch.name}
            </p>
            <p className="text-xs text-gray-400">New</p>
          </div>
        </div>

        {/* Info */}
        <p className="text-sm text-gray-600 text-center">
          Are you sure you want to switch branches?
          Your current view will change to show data from {pendingBranch.name}.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={cancelBranchSwitch}>
            Cancel
          </Button>
          <Button onClick={confirmBranchSwitch}>
            Switch Branch
          </Button>
        </div>
      </div>
    </Modal>
  );
}
