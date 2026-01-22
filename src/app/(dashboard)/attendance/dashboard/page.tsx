import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import DashboardContent from '../DashboardContent';

export default async function AttendanceDashboardPage() {
  const user = await getSession();
  if (!user) redirect('/login');

  const isEmployee = user.role === 'employee';
  if (isEmployee) redirect('/attendance/sheet');

  return <DashboardContent />;
}
