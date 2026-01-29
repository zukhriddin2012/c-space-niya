import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { User } from '@/types';

// Mock user for testing
export const mockUser: User = {
  id: 'test-user-id',
  employee_id: 'TEST001',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'hr',
  system_role: 'hr',
  branch_id: 'branch-1',
  position: 'HR Manager',
  department_id: 'dept-1',
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: User | null;
}

function AllProviders({ children, user }: { children: React.ReactNode; user?: User | null }) {
  return (
    <LanguageProvider>
      <AuthProvider initialUser={user ?? mockUser}>
        {children}
      </AuthProvider>
    </LanguageProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { user, ...options }: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => <AllProviders user={user}>{children}</AllProviders>,
    ...options,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Export custom render as default render
export { renderWithProviders as render };
