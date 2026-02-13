'use client';

interface DashboardContentProps {
  children: React.ReactNode;
}

/**
 * DashboardContent — Simple passthrough wrapper.
 * Previously contained the Reception Mode overlay logic (isReceptionMode check,
 * full-screen reception UI). Simplified as part of CSN-028 (ServiceHub migration)
 * since Reception Mode toggle has been removed from the dashboard.
 */
export function DashboardContent({ children }: DashboardContentProps) {
  return <>{children}</>;
}
