'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';
import type { EmployeeSearchResult } from '@/modules/reception/types';
import { Loader2, ChevronLeft, X } from 'lucide-react';

export interface PinSwitchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewType = 'pin' | 'cross-branch-search' | 'cross-branch-pin' | 'error';

interface ErrorState {
  message: string;
  attemptsRemaining?: number;
  lockoutSeconds?: number;
}

export function PinSwitchOverlay({ isOpen, onClose }: PinSwitchOverlayProps) {
  // View and state management
  const [view, setView] = useState<ViewType>('pin');
  const [pin, setPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<EmployeeSearchResult[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState<number | null>(null);

  // Refs
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shakeDotsRef = useRef<HTMLDivElement>(null);

  // Context
  const { switchOperator, switchOperatorCrossBranch, selectedBranchId } = useReceptionMode();

  // Reset state when overlay opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetOverlayState();
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutCountdown === null) return;

    if (lockoutCountdown <= 0) {
      setLockoutCountdown(null);
      setError(null);
      setPin('');
      return;
    }

    lockoutTimerRef.current = setTimeout(() => {
      setLockoutCountdown(lockoutCountdown - 1);
    }, 1000);

    return () => {
      if (lockoutTimerRef.current) {
        clearTimeout(lockoutTimerRef.current);
      }
    };
  }, [lockoutCountdown]);

  const resetOverlayState = () => {
    setView('pin');
    setPin('');
    setIsLoading(false);
    setError(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedEmployee(null);
    setIsSearching(false);
    setLockoutCountdown(null);
    // Clear pending debounced search to prevent state updates after unmount
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
  };

  const playShakeAnimation = () => {
    if (!shakeDotsRef.current) return;
    shakeDotsRef.current.classList.remove('shake-animation');
    // Trigger reflow to restart animation
    void shakeDotsRef.current.offsetWidth;
    shakeDotsRef.current.classList.add('shake-animation');
  };

  const handlePinInput = (digit: string) => {
    if (lockoutCountdown !== null || isLoading || pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    // Auto-submit when 4 digits entered
    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

  const submitPin = async (pinValue: string) => {
    if (lockoutCountdown !== null) return;

    setIsLoading(true);
    setError(null);

    try {
      if (view === 'pin') {
        // Standard PIN entry
        const result = await switchOperator(pinValue);

        if (result.success) {
          // Show success toast and close
          setPin('');
          setTimeout(() => {
            onClose();
          }, 300);
        } else {
          // Handle error
          setPin('');
          playShakeAnimation();

          if (result.error === 'invalid_pin') {
            setError({
              message: 'Incorrect PIN',
              attemptsRemaining: result.attemptsRemaining || 0,
            });
          } else if (result.error === 'locked') {
            setLockoutCountdown(result.lockoutRemainingSeconds || 300);
            setError({
              message: 'Too many failed attempts. Account locked.',
              lockoutSeconds: result.lockoutRemainingSeconds || 300,
            });
          } else {
            setError({
              message: 'An error occurred. Please try again.',
            });
          }
        }
      } else if (view === 'cross-branch-pin' && selectedEmployee) {
        // Cross-branch PIN entry
        const result = await switchOperatorCrossBranch(selectedEmployee.id, pinValue);

        if (result.success) {
          setPin('');
          setTimeout(() => {
            onClose();
          }, 300);
        } else {
          setPin('');
          playShakeAnimation();

          if (result.error === 'invalid_pin') {
            setError({
              message: 'Incorrect PIN',
              attemptsRemaining: result.attemptsRemaining || 0,
            });
          } else if (result.error === 'locked') {
            setLockoutCountdown(result.lockoutRemainingSeconds || 300);
            setError({
              message: 'Too many failed attempts. Account locked.',
              lockoutSeconds: result.lockoutRemainingSeconds || 300,
            });
          } else {
            setError({
              message: 'An error occurred. Please try again.',
            });
          }
        }
      }
    } catch (err) {
      setPin('');
      playShakeAnimation();
      setError({
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setError(null);

      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const response = await fetch(
            `/api/reception/operator-switch/search?q=${encodeURIComponent(query)}&branchId=${selectedBranchId}`
          );
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.results || []);
          } else {
            setError({ message: 'Search failed. Please try again.' });
            setSearchResults([]);
          }
        } catch (err) {
          setError({ message: 'Search failed. Please try again.' });
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [selectedBranchId]
  );

  const handleSelectEmployee = (employee: EmployeeSearchResult) => {
    setSelectedEmployee(employee);
    setView('cross-branch-pin');
    setPin('');
    setError(null);
  };

  const handleBackToPin = () => {
    setView('pin');
    setPin('');
    setError(null);
  };

  const handleBackToSearch = () => {
    setView('cross-branch-search');
    setPin('');
    setError(null);
    setSelectedEmployee(null);
  };

  const handleCrossBranchLink = () => {
    setView('cross-branch-search');
    setPin('');
    setError(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* PIN Entry View */}
        {view === 'pin' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Operator Switch</h2>
              <p className="mt-1 text-sm text-gray-600">Enter your 4-digit PIN</p>
            </div>

            {/* PIN Dots */}
            <div
              ref={shakeDotsRef}
              className="flex justify-center gap-4"
              style={{
                animation: 'shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
              }}
            >
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                    index < pin.length
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-300 bg-white'
                  }`}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-sm font-medium text-red-700">{error.message}</p>
                {error.attemptsRemaining !== undefined && error.attemptsRemaining > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {error.attemptsRemaining} attempt{error.attemptsRemaining > 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
            )}

            {/* Numeric Keypad */}
            {lockoutCountdown === null ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handlePinInput(String(digit))}
                    disabled={pin.length >= 4}
                    className="aspect-square rounded-lg bg-gray-100 text-lg font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {digit}
                  </button>
                ))}

                {/* 0 button spanning 2 columns */}
                <button
                  onClick={() => handlePinInput('0')}
                  disabled={pin.length >= 4}
                  className="col-span-2 aspect-square rounded-lg bg-gray-100 text-lg font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  0
                </button>

                {/* Backspace button */}
                <button
                  onClick={handleBackspace}
                  disabled={pin.length === 0}
                  className="rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-100 p-4 text-center">
                <p className="text-sm font-medium text-gray-700">
                  Account locked for {lockoutCountdown}s
                </p>
              </div>
            )}

            {/* Cross-branch link */}
            <div className="text-center">
              <button
                onClick={handleCrossBranchLink}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Not from this branch?
              </button>
            </div>
          </div>
        )}

        {/* Cross-Branch Search View */}
        {view === 'cross-branch-search' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToPin}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to PIN entry"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Find Operator</h2>
                <p className="text-sm text-gray-600">Search other branches</p>
              </div>
            </div>

            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">{error.message}</p>
              </div>
            )}

            {/* Search results */}
            {searchResults.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {searchResults.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => handleSelectEmployee(employee)}
                    className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{employee.name}</p>
                    <p className="text-xs text-gray-600">
                      {employee.branchName} • {employee.role}
                    </p>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">No results found</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">Start typing to search...</p>
              </div>
            )}
          </div>
        )}

        {/* Cross-Branch PIN View */}
        {view === 'cross-branch-pin' && selectedEmployee && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToSearch}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to search"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Confirm Identity</h2>
                <p className="text-sm text-gray-600">
                  {selectedEmployee.name} from {selectedEmployee.branchName}
                </p>
              </div>
            </div>

            {/* PIN Dots */}
            <div
              ref={shakeDotsRef}
              className="flex justify-center gap-4"
            >
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                    index < pin.length
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-300 bg-white'
                  }`}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-sm font-medium text-red-700">{error.message}</p>
                {error.attemptsRemaining !== undefined && error.attemptsRemaining > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {error.attemptsRemaining} attempt{error.attemptsRemaining > 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
            )}

            {/* Numeric Keypad */}
            {lockoutCountdown === null ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handlePinInput(String(digit))}
                    disabled={pin.length >= 4}
                    className="aspect-square rounded-lg bg-gray-100 text-lg font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {digit}
                  </button>
                ))}

                {/* 0 button spanning 2 columns */}
                <button
                  onClick={() => handlePinInput('0')}
                  disabled={pin.length >= 4}
                  className="col-span-2 aspect-square rounded-lg bg-gray-100 text-lg font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  0
                </button>

                {/* Backspace button */}
                <button
                  onClick={handleBackspace}
                  disabled={pin.length === 0}
                  className="rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-100 p-4 text-center">
                <p className="text-sm font-medium text-gray-700">
                  Account locked for {lockoutCountdown}s
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS for shake animation */}
      <style>{`
        .shake-animation {
          animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-4px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(4px);
          }
        }
      `}</style>
    </div>
  );
}
