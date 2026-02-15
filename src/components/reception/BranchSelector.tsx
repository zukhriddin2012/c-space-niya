'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Globe, UserCog, Calendar } from 'lucide-react';
import { useServiceHub } from '@/contexts/ServiceHubContext';

export function BranchSelector() {
  const {
    selectedBranch,
    accessibleBranches,
    isLoadingBranches,
    requestBranchSwitch,
  } = useServiceHub();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Single branch - show as label only
  const hasMultipleBranches = accessibleBranches.filter(b => !b.isAllBranches).length > 1 ||
    accessibleBranches.some(b => b.isAllBranches);

  if (isLoadingBranches) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span className="text-sm text-sky-200">Loading...</span>
      </div>
    );
  }

  if (!selectedBranch) {
    // No branch selected - show a warning indicator
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg text-amber-100">
        <Building2 className="w-4 h-4" />
        <span className="text-sm">No branch assigned</span>
      </div>
    );
  }

  // Single branch - just display it
  if (!hasMultipleBranches) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
        <Building2 className="w-4 h-4" />
        <span className="text-sm font-medium">{selectedBranch.name}</span>
      </div>
    );
  }

  // Multiple branches - show dropdown
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          selectedBranch.isAllBranches
            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-100'
            : 'bg-white/10 hover:bg-white/20'
        }`}
      >
        {selectedBranch.isAllBranches ? (
          <Globe className="w-4 h-4" />
        ) : (
          <Building2 className="w-4 h-4" />
        )}
        <span className="text-sm font-medium max-w-[150px] truncate">
          {selectedBranch.name}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
            Select Branch
          </div>
          <div className="max-h-64 overflow-y-auto">
            {accessibleBranches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => {
                  requestBranchSwitch(branch.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  branch.id === selectedBranch.id
                    ? 'bg-sky-50 text-sky-700'
                    : 'hover:bg-gray-50 text-gray-700'
                } ${branch.isAllBranches ? 'border-t border-gray-100 mt-1' : ''}`}
              >
                {branch.isAllBranches ? (
                  <Globe className="w-4 h-4 text-red-500" />
                ) : (
                  <Building2 className="w-4 h-4 text-gray-400" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className={`text-sm font-medium truncate ${
                      branch.isAllBranches ? 'text-red-600' : ''
                    }`}>
                      {branch.name}
                    </p>
                    {branch.isFromAssignment && (
                      <UserCog className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  {branch.isAssigned && (
                    <p className="text-xs text-gray-400">Your assigned branch</p>
                  )}
                  {branch.isFromAssignment && !branch.isAssigned && (
                    <p className="text-xs text-amber-500 flex items-center gap-1">
                      <span>Assignment</span>
                      {branch.assignmentEndsAt && (
                        <>
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{new Date(branch.assignmentEndsAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </p>
                  )}
                  {branch.isGranted && !branch.isAssigned && !branch.isFromAssignment && (
                    <p className="text-xs text-gray-400">Additional access</p>
                  )}
                </div>
                {branch.id === selectedBranch.id && (
                  <Check className="w-4 h-4 text-sky-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
