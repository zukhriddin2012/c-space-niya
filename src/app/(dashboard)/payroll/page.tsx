import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import PayrollContent from './PayrollContent';

export default async function PayrollPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  if (!hasPermission(user.role, PERMISSIONS.PAYROLL_VIEW)) {
    redirect('/dashboard');
  }

  const canProcessPayroll = hasPermission(user.role, PERMISSIONS.PAYROLL_PROCESS);
  const canApprovePayroll = hasPermission(user.role, PERMISSIONS.PAYROLL_APPROVE);

  return (
    <PayrollContent
      canProcessPayroll={canProcessPayroll}
      canApprovePayroll={canApprovePayroll}
    />
  );
}
