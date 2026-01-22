'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export default function AccountingPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Redirect based on role
      if (hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL)) {
        router.replace('/accounting/requests');
      } else if (hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_CREATE)) {
        router.replace('/accounting/my-requests');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );
}
