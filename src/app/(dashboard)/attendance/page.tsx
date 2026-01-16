import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Clock, CheckCircle, AlertCircle, XCircle, Download, Filter, Calendar } from 'lucide-react';

// Demo attendance data
const demoAttendance = [
  {
    id: '1',
    employeeId: 'EMP-001',
    employeeName: 'Aziz Karimov',
    branch: 'C-Space Airport',
    checkInTime: '2026-01-16T09:02:00',
    checkOutTime: '2026-01-16T18:05:00',
    status: 'present',
    source: 'telegram',
  },
  {
    id: '2',
    employeeId: 'EMP-002',
    employeeName: 'Dilnoza Rustamova',
    branch: 'C-Space Beruniy',
    checkInTime: '2026-01-16T09:05:00',
    checkOutTime: null,
    status: 'present',
    source: 'telegram',
  },
  {
    id: '3',
    employeeId: 'EMP-003',
    employeeName: 'Bobur Aliyev',
    branch: 'C-Space Labzak',
    checkInTime: '2026-01-16T09:18:00',
    checkOutTime: null,
    status: 'late',
    source: 'telegram',
  },
  {
    id: '4',
    employeeId: 'EMP-004',
    employeeName: 'Madina Tosheva',
    branch: 'C-Space Muqumiy',
    checkInTime: '2026-01-16T09:00:00',
    checkOutTime: null,
    status: 'present',
    source: 'web',
  },
  {
    id: '5',
    employeeId: 'EMP-005',
    employeeName: 'Jasur Normatov',
    branch: 'C-Space Chust',
    checkInTime: '2026-01-16T08:55:00',
    checkOutTime: '2026-01-16T18:10:00',
    status: 'present',
    source: 'telegram',
  },
  {
    id: '6',
    employeeId: 'EMP-006',
    employeeName: 'Gulnora Ibragimova',
    branch: 'C-Space Airport',
    checkInTime: null,
    checkOutTime: null,
    status: 'absent',
    source: null,
  },
  {
    id: '7',
    employeeId: 'EMP-007',
    employeeName: 'Sardor Yusupov',
    branch: 'C-Space Yunusabad',
    checkInTime: '2026-01-16T08:45:00',
    checkOutTime: '2026-01-16T14:30:00',
    status: 'early_leave',
    source: 'web',
  },
];

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; className: string; icon: React.ComponentType<{ size?: number }> }
  > = {
    present: {
      label: 'Present',
      className: 'bg-green-50 text-green-700',
      icon: CheckCircle,
    },
    late: {
      label: 'Late',
      className: 'bg-orange-50 text-orange-700',
      icon: AlertCircle,
    },
    absent: {
      label: 'Absent',
      className: 'bg-red-50 text-red-700',
      icon: XCircle,
    },
    early_leave: {
      label: 'Early Leave',
      className: 'bg-yellow-50 text-yellow-700',
      icon: Clock,
    },
  };

  const config = statusConfig[status] || statusConfig.absent;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-gray-400">-</span>;

  const sourceConfig: Record<string, { label: string; className: string }> = {
    telegram: { label: 'Telegram', className: 'bg-blue-50 text-blue-700' },
    web: { label: 'Web', className: 'bg-purple-50 text-purple-700' },
    manual: { label: 'Manual', className: 'bg-gray-50 text-gray-700' },
  };

  const config = sourceConfig[source] || sourceConfig.manual;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatTime(dateString: string | null) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function calculateHours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return '-';
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return `${hours.toFixed(1)}h`;
}

export default async function AttendancePage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // For employees, show only their own attendance
  const isEmployee = user.role === 'employee';

  const stats = {
    present: demoAttendance.filter((a) => a.status === 'present').length,
    late: demoAttendance.filter((a) => a.status === 'late').length,
    absent: demoAttendance.filter((a) => a.status === 'absent').length,
    earlyLeave: demoAttendance.filter((a) => a.status === 'early_leave').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">
            {isEmployee
              ? 'View your attendance history'
              : 'Monitor and manage employee attendance across all branches'}
          </p>
        </div>
        {!isEmployee && (
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            <Download size={20} />
            Export Report
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {!isEmployee && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle size={20} />
              <span className="text-sm font-medium">Present</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.present}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">Late</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.late}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <XCircle size={20} />
              <span className="text-sm font-medium">Absent</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.absent}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <Clock size={20} />
              <span className="text-sm font-medium">Early Leave</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.earlyLeave}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              defaultValue="2026-01-16"
              className="outline-none text-sm"
            />
          </div>
          {!isEmployee && (
            <>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm">
                <option value="">All Branches</option>
                <option value="airport">C-Space Airport</option>
                <option value="beruniy">C-Space Beruniy</option>
                <option value="chust">C-Space Chust</option>
                <option value="labzak">C-Space Labzak</option>
                <option value="muqumiy">C-Space Muqumiy</option>
                <option value="yunusabad">C-Space Yunusabad</option>
                <option value="elbek">C-Space Elbek</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm">
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="early_leave">Early Leave</option>
              </select>
            </>
          )}
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Filter size={16} />
            More Filters
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check In
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check Out
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {demoAttendance.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 text-sm font-medium">
                        {record.employeeName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{record.employeeName}</p>
                      <p className="text-xs text-gray-500">{record.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{record.branch}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatTime(record.checkInTime)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatTime(record.checkOutTime)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {calculateHours(record.checkInTime, record.checkOutTime)}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={record.status} />
                </td>
                <td className="px-6 py-4">
                  <SourceBadge source={record.source} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to{' '}
            <span className="font-medium">{demoAttendance.length}</span> records
          </p>
          <div className="flex gap-2">
            <button
              disabled
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
