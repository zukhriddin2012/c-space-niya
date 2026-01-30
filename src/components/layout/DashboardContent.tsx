'use client';

import { useReceptionMode } from '@/contexts/ReceptionModeContext';

interface DashboardContentProps {
  children: React.ReactNode;
}

export function DashboardContent({ children }: DashboardContentProps) {
  const { isReceptionMode } = useReceptionMode();

  if (isReceptionMode) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Reception Mode</h1>
          <p className="text-gray-400">Coming soon...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
