'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { BranchOption, OperatorIdentity, OperatorSwitchResult } from '@/modules/reception/types';

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

  // Operator identity (R6a)
  currentOperator: OperatorIdentity | null;
  isOperatorSwitched: boolean;
  switchOperator: (pin: string) => Promise<OperatorSwitchResult>;
  switchOperatorCrossBranch: (employeeId: string, pin: string) => Promise<OperatorSwitchResult>;
  clearOperator: () => void;

  // Refresh
  refreshBranches: () => Promise<void>;
}

const ReceptionModeContext = createContext<ReceptionModeContextType | undefined>(undefined);

const STORAGE_KEY = 'reception_selected_branch';
const MODE_STORAGE_KEY = 'reception_mode_active';
const OPERATOR_STORAGE_KEY = 'reception_current_operator';

export function ReceptionModeProvider({ children }: { children: ReactNode }) {
  // Mode state — restore synchronously to prevent operator being cleared on mount
  const [isReceptionMode, setIsReceptionModeState] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(MODE_STORAGE_KEY) === 'true';
  });
  const isInitialMount = useRef(true);

  // Mark initial mount complete after first render
  useEffect(() => {
    setTimeout(() => {
      isInitialMount.current = false;
    }, 0);
  }, []);

  // Wrapper to persist mode changes
  const setIsReceptionMode = useCallback((value: boolean) => {
    setIsReceptionModeState(value);
    if (!isInitialMount.current) {
      sessionStorage.setItem(MODE_STORAGE_KEY, value ? 'true' : 'false');
    }
  }, []);

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
      // H-06: Store with timestamp for session expiry validation
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
      console.error('[ReceptionMode] Operator switch failed:', error);
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
      console.error('[ReceptionMode] Cross-branch switch failed:', error);
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
        console.error('[ReceptionMode] Failed to fetch branches:', response.status, errorData);
      }
    } catch (error) {
      console.error('[ReceptionMode] Error fetching branches:', error);
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

  // Clear operator when leaving reception mode — but skip on initial mount
  // (isReceptionMode starts false and gets restored from sessionStorage async)
  const hasReceptionModeBeenSet = useRef(false);
  useEffect(() => {
    if (isReceptionMode) {
      hasReceptionModeBeenSet.current = true;
    } else if (hasReceptionModeBeenSet.current) {
      // Only clear when user actually leaves reception mode, not on initial mount
      persistOperator(null);
    }
  }, [isReceptionMode, persistOperator]);

  const toggleReceptionMode = useCallback(() => {
    const newValue = !isReceptionMode;
    setIsReceptionMode(newValue);
  }, [isReceptionMode, setIsReceptionMode]);

  const setReceptionMode = useCallback((value: boolean) => {
    setIsReceptionMode(value);
  }, [setIsReceptionMode]);

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

// ═══ Helper: get operator headers for API calls ═══

export function getOperatorHeaders(currentOperator: OperatorIdentity | null, userId: string): Record<string, string> {
  return {
    'X-Operator-Id': currentOperator?.id ?? userId,
    'X-Operator-Cross-Branch': currentOperator?.isCrossBranch ? 'true' : 'false',
  };
}
