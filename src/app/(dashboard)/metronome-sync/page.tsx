import { getSession } from '@/lib/auth-server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import MetronomeDashboard from '@/components/metronome/MetronomeDashboard';

export default async function MetronomeSyncPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (!hasPermission(user.role, PERMISSIONS.METRONOME_VIEW)) redirect('/dashboard');

  const canEdit = hasPermission(user.role, PERMISSIONS.METRONOME_EDIT_ALL);
  const canCreate = hasPermission(user.role, PERMISSIONS.METRONOME_CREATE);
  const canRunMeeting = hasPermission(user.role, PERMISSIONS.METRONOME_RUN_MEETING);
  const canManageDates = hasPermission(user.role, PERMISSIONS.METRONOME_MANAGE_DATES);

  return (
    <MetronomeDashboard
      userId={user.id}
      userRole={user.role}
      canEdit={canEdit}
      canCreate={canCreate}
      canRunMeeting={canRunMeeting}
      canManageDates={canManageDates}
    />
  );
}
