'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { BranchOption, OperatorIdentity, OperatorSwitchResult } from '@/modules/reception/types';

interface BranchData {
  branches: BranchOption[];
  defaultBranchId: string | null;
  canSeeAllBranches: boolean;
  totalBranchCount: number;
}

interface ServiceHubContextType {
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

  // Operator identity (R6a)
  currentOperator: OperatorIdentity | null;
  isOperatorSwitched: boolean;
  switchOperator: (pin: string) => Promise<OperatorSwitchResult>;
  switchOperatorCrossBranch: (employeeId: string, pin: string) => Promise<OperatorSwitchResult>;
  clearOperator: () => void;

  // Refresh
  refreshBranches: () => Promise<void>;
}

const ServiceHubContext = createContext<ServiceHubContextType | undefined>(undefined);

const STORAGE_KEY = 'reception_selected_branch';
const OPERATOR_STORAGE_KEY = 'reception_current_operator';

export function ServiceHubProvider({ children }: { children: ReactNode }) {
  // Branch state
  const [branchData, setBranchData] = useState<BranchData>({
    branches: [],
    defaultBranchId: null,
    canSeeAllBranches: false,
    totalBranchCount: 0,
  });
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(STORAGE_KEY) || null;
  });
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Branch switch confirmation
  const [showBranchSwitchConfirm, setShowBranchSwitchConfirm] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);

  // Operator identity state (R6a) — restore synchronously to avoid race condition
  const [currentOperator, setCurrentOperator] = useState<OperatorIdentity | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem(OPERATOR_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours
      if (parsed.operator && parsed.timestamp) {
        if (Date.now() - parsed.timestamp > MAX_SESSION_AGE_MS) {
          sessionStorage.removeItem(OPERATOR_STORAGE_KEY);
          return null;
        }
        return parsed.operator as OperatorIdentity;
      }
      // Legacy format — clear
      sessionStorage.removeItem(OPERATOR_STORAGE_KEY);
      return null;
    } catch {
      sessionStorage.removeItem(OPERATOR_STORAGE_KEY);
      return null;
    }
  });

  // Persist operator changes to sessionStorage
  const persistOperator = useCallback((operator: OperatorIdentity | null) => {
    setCurrentOperator(operator);
    if (operator) {
      sessionStorage.setItem(OPERATOR_STORAGE_KEY, JSON.stringify({
        operator,
        timestamp: Date.now(),
      }));
    } else {
      sessionStorage.removeItem(OPERATOR_STORAGE_KEY);
    }
  }, []);

  // Switch operator via PIN (same branch)
  const switchOperator = useCallback(async (pin: string): Promise<OperatorSwitchResult> => {
    if (!selectedBranchId) {
      return { success: false, error: 'invalid_pin' };
    }

    try {
      const response = await fetch('/api/reception/operator-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, branchId: selectedBranchId }),
      });

      const result: OperatorSwitchResult = await response.json();

      if (result.success && result.operator) {
        persistOperator(result.operator);
      }

      return result;
    } catch (error) {
      console.error('[ServiceHub] Operator switch failed:', error);
      return { success: false, error: 'invalid_pin' };
    }
  }, [selectedBranchId, persistOperator]);

  // Switch operator via cross-branch search
  const switchOperatorCrossBranch = useCallback(async (employeeId: string, pin: string): Promise<OperatorSwitchResult> => {
    if (!selectedBranchId) {
      return { success: false, error: 'invalid_pin' };
    }

    try {
      const response = await fetch('/api/reception/operator-switch/cross-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, pin, branchId: selectedBranchId }),
      });

      const result: OperatorSwitchResult = await response.json();

      if (result.success && result.operator) {
        persistOperator(result.operator);
      }

      return result;
    } catch (error) {
      console.error('[ServiceHub] Cross-branch switch failed:', error);
      return { success: false, error: 'employee_not_found' };
    }
  }, [selectedBranchId, persistOperator]);

  // Clear operator (revert to logged-in user)
  const clearOperator = useCallback(() => {
    persistOperator(null);
  }, [persistOperator]);

  // Is the operator different from the logged-in user?
  const isOperatorSwitched = currentOperator !== null;

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
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ServiceHub] Failed to fetch branches:', response.status, errorData);
      }
    } catch (error) {
      console.error('[ServiceHub] Error fetching branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  // CSN-028: Fetch branches on mount (no longer gated by isReceptionMode)
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Get selected branch object
  const selectedBranch = branchData.branches.find(b => b.id === selectedBranchId) || null;

  // Direct branch selection (no confirmation)
  const setSelectedBranch = useCallback((branchId: string) => {
    setSelectedBranchId((prev) => {
      if (prev === branchId) return prev; // No-op if same branch
      // Clear operator on branch switch — different branch means different PIN pool
      persistOperator(null);
      sessionStorage.setItem(STORAGE_KEY, branchId);
      return branchId;
    });
  }, [persistOperator]);

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
    <ServiceHubContext.Provider
      value={{
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

        // Operator identity (R6a)
        currentOperator,
        isOperatorSwitched,
        switchOperator,
        switchOperatorCrossBranch,
        clearOperator,

        // Refresh
        refreshBranches,
      }}
    >
      {children}
    </ServiceHubContext.Provider>
  );
}

export function useServiceHub() {
  const context = useContext(ServiceHubContext);
  if (context === undefined) {
    throw new Error('useServiceHub must be used within a ServiceHubProvider');
  }
  return context;
}

// ═══ Helper: get operator headers for API calls ═══

export function getOperatorHeaders(currentOperator: OperatorIdentity | null, userId: string, branchId?: string | null): Record<string, string> {
  const headers: Record<string, string> = {};

  // Only send operator header when a PIN-switched operator is active
  if (currentOperator?.id) {
    headers['X-Operator-Id'] = currentOperator.id;
    headers['X-Operator-Cross-Branch'] = currentOperator.isCrossBranch ? 'true' : 'false';
  }

  // Always send the branch ID so the backend can scope queries correctly
  const effectiveBranchId = currentOperator?.branchId || branchId;
  if (effectiveBranchId) {
    headers['X-Branch-Id'] = effectiveBranchId;
  }
  return headers;
}
