import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PayrollContent from './PayrollContent';

export default async function PayrollPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  if (!hasPermission(user.role, 'view_wages')) {
    redirect('/dashboard');
  }

  const canProcessPayroll = hasPermission(user.role, 'process_payroll');
  const canApprovePayroll = hasPermission(user.role, 'approve_payroll');

  return (
    <PayrollContent
      canProcessPayroll={canProcessPayroll}
      canApprovePayroll={canApprovePayroll}
    />
  );
}
