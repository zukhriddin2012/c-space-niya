'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { BranchOption } from '@/modules/reception/types';

interface BranchData {
  branches: BranchOption[];
  defaultBranchId: string | null;
  canSeeAllBranches: boolean;
  totalBranchCount: number;
}

interface ReceptionModeContextType {
  // Mode state
  isReceptionMode: boolean;
  toggleReceptionMode: () => void;
  setReceptionMode: (value: boolean) => void;

  // Branch state
  selectedBranchId: string | null;
  selectedBranch: BranchOption | null;
  accessibleBranches: BranchOption[];
  defaultBranchId: string | null;
  canSeeAllBranches: boolean;
  isLoadingBranches: boolean;

  // Branch actions
  setSelectedBranch: (branchId: string) => void;
  showBranchSwitchConfirm: boolean;
  pendingBranchId: string | null;
  confirmBranchSwitch: () => void;
  cancelBranchSwitch: () => void;
  requestBranchSwitch: (branchId: string) => void;

  // Refresh
  refreshBranches: () => Promise<void>;
}

const ReceptionModeContext = createContext<ReceptionModeContextType | undefined>(undefined);

const STORAGE_KEY = 'reception_selected_branch';

export function ReceptionModeProvider({ children }: { children: ReactNode }) {
  // Mode state
  const [isReceptionMode, setIsReceptionMode] = useState(false);

  // Branch state
  const [branchData, setBranchData] = useState<BranchData>({
    branches: [],
    defaultBranchId: null,
    canSeeAllBranches: false,
    totalBranchCount: 0,
  });
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Branch switch confirmation
  const [showBranchSwitchConfirm, setShowBranchSwitchConfirm] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);

  // Fetch accessible branches
  const fetchBranches = useCallback(async () => {
    setIsLoadingBranches(true);
    try {
      const response = await fetch('/api/reception/branches');
      if (response.ok) {
        const data: BranchData = await response.json();
        setBranchData(data);

        // Set initial branch from storage or default
        const storedBranchId = sessionStorage.getItem(STORAGE_KEY);
        const validBranch = data.branches.find(b => b.id === storedBranchId);

        if (validBranch) {
          setSelectedBranchId(storedBranchId);
        } else if (data.defaultBranchId) {
          setSelectedBranchId(data.defaultBranchId);
        } else if (data.branches.length > 0) {
          // Fall back to first non-"all" branch
          const firstBranch = data.branches.find(b => !b.isAllBranches) || data.branches[0];
          setSelectedBranchId(firstBranch.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  // Fetch branches when entering reception mode
  useEffect(() => {
    if (isReceptionMode) {
      fetchBranches();
    }
  }, [isReceptionMode, fetchBranches]);

  const toggleReceptionMode = () => {
    setIsReceptionMode((prev) => !prev);
  };

  const setReceptionMode = (value: boolean) => {
    setIsReceptionMode(value);
  };

  // Get selected branch object
  const selectedBranch = branchData.branches.find(b => b.id === selectedBranchId) || null;

  // Direct branch selection (no confirmation)
  const setSelectedBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    sessionStorage.setItem(STORAGE_KEY, branchId);
  };

  // Request branch switch (with confirmation)
  const requestBranchSwitch = (branchId: string) => {
    if (branchId === selectedBranchId) return;

    // If user only has access to one branch, switch directly
    if (branchData.branches.filter(b => !b.isAllBranches).length <= 1) {
      setSelectedBranch(branchId);
      return;
    }

    // Show confirmation modal
    setPendingBranchId(branchId);
    setShowBranchSwitchConfirm(true);
  };

  const confirmBranchSwitch = () => {
    if (pendingBranchId) {
      setSelectedBranch(pendingBranchId);
    }
    setShowBranchSwitchConfirm(false);
    setPendingBranchId(null);
  };

  const cancelBranchSwitch = () => {
    setShowBranchSwitchConfirm(false);
    setPendingBranchId(null);
  };

  const refreshBranches = async () => {
    await fetchBranches();
  };

  return (
    <ReceptionModeContext.Provider
      value={{
        // Mode
        isReceptionMode,
        toggleReceptionMode,
        setReceptionMode,

        // Branch state
        selectedBranchId,
        selectedBranch,
        accessibleBranches: branchData.branches,
        defaultBranchId: branchData.defaultBranchId,
        canSeeAllBranches: branchData.canSeeAllBranches,
        isLoadingBranches,

        // Branch actions
        setSelectedBranch,
        showBranchSwitchConfirm,
        pendingBranchId,
        confirmBranchSwitch,
        cancelBranchSwitch,
        requestBranchSwitch,

        // Refresh
        refreshBranches,
      }}
    >
      {children}
    </ReceptionModeContext.Provider>
  );
}

export function useReceptionMode() {
  const context = useContext(ReceptionModeContext);
  if (context === undefined) {
    throw new Error('useReceptionMode must be used within a ReceptionModeProvider');
  }
  return context;
}
