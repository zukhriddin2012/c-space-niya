'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ReceptionModeContextType {
  isReceptionMode: boolean;
  toggleReceptionMode: () => void;
  setReceptionMode: (value: boolean) => void;
}

const ReceptionModeContext = createContext<ReceptionModeContextType | undefined>(undefined);

export function ReceptionModeProvider({ children }: { children: ReactNode }) {
  const [isReceptionMode, setIsReceptionMode] = useState(false);

  const toggleReceptionMode = () => {
    setIsReceptionMode((prev) => !prev);
  };

  const setReceptionMode = (value: boolean) => {
    setIsReceptionMode(value);
  };

  return (
    <ReceptionModeContext.Provider value={{ isReceptionMode, toggleReceptionMode, setReceptionMode }}>
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
