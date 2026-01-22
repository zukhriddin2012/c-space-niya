'use client';

import React from 'react';

interface AttendanceRecord {
  id: string;
  employeeDbId: string;
  employeeId: string;
  employeeName: string;
  position: string;
  branchId: string | null;
  branchName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'present' | 'late' | 'absent' | 'early_leave';
  totalHours: number | null;
  isOvernight?: boolean;
  overnightFromDate?: string;
}

interface BranchViewProps {
  records: AttendanceRecord[];
  branches: { id: string; name: string }[];
}

function formatTime(dateString: string | null) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function BranchView({ records, branches }: BranchViewProps) {
  // Group records by branch
  const branchGroups = new Map<string, {
    branchId: string;
    branchName: string;
    employees: AttendanceRecord[];
    lateCount: number;
  }>();

  // Initialize all branches (including empty ones)
  branches.forEach(branch => {
    branchGroups.set(branch.id, {
      branchId: branch.id,
      branchName: branch.name,
      employees: [],
      lateCount: 0,
    });
  });

  // Group present employees by their check-in branch
  records.forEach(record => {
    if (record.status !== 'absent' && record.branchId) {
      const group = branchGroups.get(record.branchId);
      if (group) {
        group.employees.push(record);
        if (record.status === 'late') {
          group.lateCount++;
        }
      }
    }
  });

  // Sort groups: branches with employees first, then empty ones
  const sortedGroups = Array.from(branchGroups.values()).sort((a, b) => {
    if (a.employees.length > 0 && b.employees.length === 0) return -1;
    if (a.employees.length === 0 && b.employees.length > 0) return 1;
    return b.employees.length - a.employees.length; // More employees first
  });

  // Sort employees within each branch by check-in time
  sortedGroups.forEach(group => {
    group.employees.sort((a, b) => {
      if (a.status === 'late' && b.status !== 'late') return 1;
      if (a.status !== 'late' && b.status === 'late') return -1;
      return (a.checkInTime || '').localeCompare(b.checkInTime || '');
    });
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 text-left border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-44">Branch</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Present</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-16 text-center">#</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedGroups.map(group => (
            <tr
              key={group.branchId}
              className={`hover:bg-gray-50 ${group.employees.length === 0 ? 'opacity-50' : ''}`}
            >
              <td className="px-4 py-3">
                <div className={`font-medium ${group.employees.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                  {group.branchName}
                </div>
                {group.lateCount > 0 && (
                  <div className="text-xs text-orange-500">{group.lateCount} late</div>
                )}
              </td>
              <td className="px-4 py-3">
                {group.employees.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {group.employees.map(emp => (
                      <span
                        key={emp.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-default
                          ${emp.status === 'late'
                            ? 'bg-orange-50 border border-orange-200 text-orange-700'
                            : 'bg-green-50 border border-green-200 text-gray-700'
                          }`}
                        title={`${emp.employeeName} - ${emp.position}`}
                      >
                        {emp.employeeName.split(' ').map(n => n[0]).join('')}. {emp.employeeName.split(' ').slice(-1)[0]}
                        <span className={emp.status === 'late' ? 'text-orange-400' : 'text-gray-400'}>
                          {formatTime(emp.checkInTime)}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No one present</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full
                  ${group.employees.length > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {group.employees.length}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
