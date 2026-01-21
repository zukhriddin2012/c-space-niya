'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MapPin,
  Moon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ManualCheckoutButton from './ManualCheckoutButton';
import ReminderButton from './ReminderButton';

interface AttendanceSession {
  id: string;
  checkIn: string | null;
  checkOut: string | null;
  branchName: string;
  totalHours: number | null;
  status: 'present' | 'late' | 'early_leave';
  isActive: boolean;
}

interface AttendanceRecord {
  id: string;
  attendanceDbId: string | null;
  employeeDbId: string;
  employeeId: string;
  employeeName: string;
  position: string;
  branchId: string | null;
  branchName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'present' | 'late' | 'absent' | 'early_leave';
  source: 'telegram' | 'web' | 'manual' | null;
  totalHours: number | null;
  isOvernight?: boolean;
  overnightFromDate?: string;
  // Multi-session support
  sessions?: AttendanceSession[];
  sessionCount?: number;
  totalSessionHours?: number;
  hasActiveSession?: boolean;
}

type SortField = 'employeeName' | 'branchName' | 'checkInTime' | 'checkOutTime' | 'status' | 'hours';
type SortDirection = 'asc' | 'desc';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  canEditAttendance: boolean;
}

function StatusBadge({ status, isOvernight }: { status: string; isOvernight?: boolean }) {
  const statusConfig: Record<
    string,
    { label: string; className: string; icon: React.ComponentType<{ size?: number }> }
  > = {
    present: { label: 'On Time', className: 'bg-green-50 text-green-700', icon: CheckCircle },
    late: { label: 'Late', className: 'bg-orange-50 text-orange-700', icon: AlertCircle },
    absent: { label: 'Absent', className: 'bg-red-50 text-red-700', icon: XCircle },
    early_leave: { label: 'Early Leave', className: 'bg-yellow-50 text-yellow-700', icon: Clock },
    overnight: { label: 'Overnight', className: 'bg-indigo-50 text-indigo-700', icon: Moon },
  };

  const displayStatus = isOvernight ? 'overnight' : status;
  const config = statusConfig[displayStatus] || statusConfig.absent;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function formatTime(dateString: string | null) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function calculateHours(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function formatHours(hours: number | null): string {
  if (hours === null) return '-';
  return `${hours.toFixed(1)}h`;
}

const statusOrder: Record<string, number> = {
  present: 1,
  late: 2,
  early_leave: 3,
  absent: 4,
};

export default function AttendanceTable({ records, canEditAttendance }: AttendanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('employeeName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'employeeName':
          comparison = a.employeeName.localeCompare(b.employeeName);
          break;
        case 'branchName':
          comparison = a.branchName.localeCompare(b.branchName);
          break;
        case 'checkInTime':
          if (!a.checkInTime && !b.checkInTime) comparison = 0;
          else if (!a.checkInTime) comparison = 1;
          else if (!b.checkInTime) comparison = -1;
          else comparison = a.checkInTime.localeCompare(b.checkInTime);
          break;
        case 'checkOutTime':
          if (!a.checkOutTime && !b.checkOutTime) comparison = 0;
          else if (!a.checkOutTime) comparison = 1;
          else if (!b.checkOutTime) comparison = -1;
          else comparison = a.checkOutTime.localeCompare(b.checkOutTime);
          break;
        case 'status':
          comparison = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          break;
        case 'hours':
          const hoursA = a.totalHours ?? calculateHours(a.checkInTime, a.checkOutTime) ?? -1;
          const hoursB = b.totalHours ?? calculateHours(b.checkInTime, b.checkOutTime) ?? -1;
          comparison = hoursA - hoursB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [records, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="text-purple-600" />
      : <ArrowDown size={14} className="text-purple-600" />;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      className="text-left px-3 lg:px-4 xl:px-6 py-2.5 lg:py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
    >
      <div className="flex items-center gap-1.5">
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  );

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <SortableHeader field="employeeName">Employee</SortableHeader>
                <SortableHeader field="branchName">Branch</SortableHeader>
                <SortableHeader field="checkInTime">Check In</SortableHeader>
                <SortableHeader field="checkOutTime">Check Out</SortableHeader>
                <SortableHeader field="hours">Hours</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                {canEditAttendance && (
                  <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedRecords.map((record) => {
                const hasMultipleSessions = (record.sessionCount || 0) > 1;
                const isExpanded = expandedRows.has(record.id);

                return (
                  <React.Fragment key={record.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 lg:px-4 xl:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-purple-700 text-sm font-medium">{record.employeeName.charAt(0)}</span>
                            </div>
                            {/* Green dot for currently in office */}
                            {record.hasActiveSession && record.status !== 'absent' && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{record.employeeName}</p>
                            <p className="text-xs text-gray-500 truncate">{record.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-4 xl:px-6 py-3 lg:py-4">
                        {hasMultipleSessions ? (
                          <button
                            onClick={() => toggleExpand(record.id)}
                            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                          >
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                              {record.sessionCount} sessions
                            </span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900 truncate">{record.branchName}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 lg:px-4 xl:px-6 py-3 lg:py-4">
                        {hasMultipleSessions ? (
                          <span className="text-sm text-gray-500">-</span>
                        ) : (
                          <span className={`text-sm ${record.status === 'late' && !record.isOvernight ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                            {formatTime(record.checkInTime)}
                            {record.isOvernight && <span className="text-indigo-500 text-xs ml-1">(prev)</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-3 lg:px-4 xl:px-6 py-3 lg:py-4">
                        {hasMultipleSessions ? (
                          <span className="text-sm text-gray-500">-</span>
                        ) : (
                          <span className={`text-sm ${record.status === 'early_leave' ? 'text-yellow-600 font-medium' : 'text-gray-900'}`}>
                            {formatTime(record.checkOutTime)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 lg:px-4 xl:px-6 py-3 lg:py-4">
                        {hasMultipleSessions ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold rounded-lg">
                            {record.totalSessionHours}h
                          </span>
                        ) : (
                          <span className="text-sm text-gray-900">
                            {formatHours(record.totalHours ?? calculateHours(record.checkInTime, record.checkOutTime))}
                          </span>
                        )}
                      </td>
                      <td className="px-3 lg:px-4 xl:px-6 py-3 lg:py-4">
                        <StatusBadge status={record.status} isOvernight={record.isOvernight} />
                      </td>
                      {canEditAttendance && (
                        <td className="px-3 lg:px-4 xl:px-6 py-3 lg:py-4">
                          <div className="flex items-center gap-2">
                            {record.attendanceDbId && record.hasActiveSession && record.status !== 'absent' && (
                              <ManualCheckoutButton
                                attendanceId={record.attendanceDbId}
                                employeeName={record.employeeName}
                                checkInTime={formatTime(record.checkInTime)}
                              />
                            )}
                            {record.status === 'absent' && (
                              <ReminderButton employeeId={record.employeeDbId} employeeName={record.employeeName} type="checkin" />
                            )}
                            {record.hasActiveSession && record.status !== 'absent' && (
                              <ReminderButton employeeId={record.employeeDbId} employeeName={record.employeeName} type="checkout" />
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {/* Expanded sessions row */}
                    {hasMultipleSessions && isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={canEditAttendance ? 7 : 6} className="px-3 lg:px-4 xl:px-6 py-3">
                          <div className="space-y-2 ml-11">
                            {record.sessions?.map((session, idx) => (
                              <div
                                key={session.id}
                                className={`flex items-center gap-4 px-3 py-2 rounded-lg ${
                                  session.isActive ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200'
                                }`}
                              >
                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-medium">
                                  {idx + 1}
                                </span>
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin size={12} className="text-gray-400" />
                                  <span className="text-gray-600">{session.branchName}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-500">In:</span>{' '}
                                  <span className="font-medium">{formatTime(session.checkIn)}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-500">Out:</span>{' '}
                                  <span className="font-medium">{formatTime(session.checkOut)}</span>
                                </div>
                                <div className="text-sm font-medium text-purple-600">
                                  {session.isActive ? (
                                    <span className="text-blue-600">Active</span>
                                  ) : (
                                    formatHours(session.totalHours)
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No attendance records found for the selected filters.</p>
          </div>
        )}

        <div className="flex items-center justify-between px-3 lg:px-4 xl:px-6 py-3 lg:py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">{sortedRecords.length}</span> records
          </p>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sortedRecords.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No attendance records found.</p>
          </div>
        ) : (
          sortedRecords.map((record) => (
            <div key={record.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-700 font-medium">{record.employeeName.charAt(0)}</span>
                    </div>
                    {/* Green dot for currently in office */}
                    {record.checkInTime && !record.checkOutTime && record.status !== 'absent' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{record.employeeName}</p>
                    <p className="text-xs text-gray-500">{record.position}</p>
                  </div>
                </div>
                <StatusBadge status={record.status} isOvernight={record.isOvernight} />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <MapPin size={14} />
                <span>{record.branchName}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Check In</p>
                  <p className={`text-sm font-medium ${record.status === 'late' ? 'text-orange-600' : 'text-gray-900'}`}>
                    {formatTime(record.checkInTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Check Out</p>
                  <p className={`text-sm font-medium ${record.status === 'early_leave' ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {formatTime(record.checkOutTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Hours</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatHours(record.totalHours ?? calculateHours(record.checkInTime, record.checkOutTime))}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
