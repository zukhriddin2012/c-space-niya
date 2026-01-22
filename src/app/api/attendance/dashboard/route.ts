import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getBranches, getEmployees, getAttendanceByDate } from '@/lib/db';

// Get current date in Tashkent timezone (UTC+5)
function getTashkentDateString(): string {
  const now = new Date();
  const tashkentTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const year = tashkentTime.getFullYear();
  const month = String(tashkentTime.getMonth() + 1).padStart(2, '0');
  const day = String(tashkentTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const GET = withAuth(async () => {
  try {
    const selectedDate = getTashkentDateString();

    const [attendance, employees, branches] = await Promise.all([
      getAttendanceByDate(selectedDate),
      getEmployees(),
      getBranches(),
    ]);

    // Deduplicate by employee_id
    const employeeAttendanceMap = new Map<string, any>();
    for (const a of attendance) {
      const existing = employeeAttendanceMap.get(a.employee_id);
      if (!existing) {
        employeeAttendanceMap.set(a.employee_id, a);
      } else {
        const existingHasNoCheckout = !existing.check_out;
        const currentHasNoCheckout = !a.check_out;
        if (currentHasNoCheckout && !existingHasNoCheckout) {
          employeeAttendanceMap.set(a.employee_id, a);
        } else if (!currentHasNoCheckout && existingHasNoCheckout) {
          // Keep existing
        } else {
          if (a.check_in && existing.check_in && a.check_in > existing.check_in) {
            employeeAttendanceMap.set(a.employee_id, a);
          }
        }
      }
    }

    const attendanceRecords = Array.from(employeeAttendanceMap.values()).map((a: any) => ({
      id: a.id,
      employeeDbId: a.employee_id,
      branchId: a.check_in_branch_id,
      checkOutTime: a.check_out ? `${selectedDate}T${a.check_out}` : null,
      status: a.status as 'present' | 'late' | 'absent' | 'early_leave',
    }));

    const checkedInIds = new Set(employeeAttendanceMap.keys());
    const activeEmployees = employees.filter(e => e.status === 'active');
    const absentEmployees = activeEmployees
      .filter(e => !checkedInIds.has(e.id))
      .map(e => ({
        id: `absent-${e.id}`,
        employeeDbId: e.id,
        branchId: e.branch_id,
        checkOutTime: null,
        status: 'absent' as const,
      }));

    const allAttendance = [...attendanceRecords, ...absentEmployees];

    // Calculate stats
    const currentlyPresent = allAttendance.filter((a) =>
      (a.status === 'present' || a.status === 'late') && !a.checkOutTime
    ).length;

    const stats = {
      total: allAttendance.length,
      present: currentlyPresent,
      late: allAttendance.filter((a) => a.status === 'late').length,
      absent: allAttendance.filter((a) => a.status === 'absent').length,
      earlyLeave: allAttendance.filter((a) => a.status === 'early_leave').length,
    };

    // Branch data for map
    const branchData = branches.map(branch => {
      const branchAttendance = allAttendance.filter(a => a.branchId === branch.id);
      return {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        latitude: branch.latitude,
        longitude: branch.longitude,
        present: branchAttendance.filter(a => (a.status === 'present' || a.status === 'late') && !a.checkOutTime).length,
        late: branchAttendance.filter(a => a.status === 'late').length,
        absent: branchAttendance.filter(a => a.status === 'absent').length,
        earlyLeave: branchAttendance.filter(a => a.status === 'early_leave').length,
        total: branchAttendance.length,
      };
    });

    // Active branches for summary
    const activeBranches = branches
      .filter(b => allAttendance.some(a => a.branchId === b.id))
      .map(branch => {
        const branchAttendance = allAttendance.filter(a => a.branchId === branch.id);
        const present = branchAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const total = branchAttendance.length;
        return {
          id: branch.id,
          name: branch.name,
          present,
          total,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        };
      });

    return NextResponse.json({
      stats,
      branchData,
      activeBranches,
      selectedDate,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
});
