import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Wallet, Download, Filter, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

// Demo payroll data
const demoPayroll = [
  {
    id: '1',
    employeeId: 'EMP-001',
    employeeName: 'Aziz Karimov',
    position: 'Branch Manager',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    grossAmount: 8500000,
    deductions: 1020000,
    netAmount: 7480000,
    status: 'paid',
    paymentDate: '2026-01-15',
  },
  {
    id: '2',
    employeeId: 'EMP-002',
    employeeName: 'Dilnoza Rustamova',
    position: 'HR Specialist',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    grossAmount: 6500000,
    deductions: 780000,
    netAmount: 5720000,
    status: 'paid',
    paymentDate: '2026-01-15',
  },
  {
    id: '3',
    employeeId: 'EMP-003',
    employeeName: 'Bobur Aliyev',
    position: 'Community Manager',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    grossAmount: 5500000,
    deductions: 660000,
    netAmount: 4840000,
    status: 'pending',
    paymentDate: null,
  },
  {
    id: '4',
    employeeId: 'EMP-004',
    employeeName: 'Madina Tosheva',
    position: 'Receptionist',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    grossAmount: 4000000,
    deductions: 480000,
    netAmount: 3520000,
    status: 'pending',
    paymentDate: null,
  },
  {
    id: '5',
    employeeId: 'EMP-005',
    employeeName: 'Jasur Normatov',
    position: 'Maintenance',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    grossAmount: 3500000,
    deductions: 420000,
    netAmount: 3080000,
    status: 'processing',
    paymentDate: null,
  },
  {
    id: '6',
    employeeId: 'EMP-006',
    employeeName: 'Gulnora Ibragimova',
    position: 'Marketing Specialist',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    grossAmount: 6000000,
    deductions: 720000,
    netAmount: 5280000,
    status: 'paid',
    paymentDate: '2026-01-15',
  },
];

function PaymentStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; className: string; icon: React.ComponentType<{ size?: number }> }
  > = {
    paid: {
      label: 'Paid',
      className: 'bg-green-50 text-green-700',
      icon: CheckCircle,
    },
    pending: {
      label: 'Pending',
      className: 'bg-yellow-50 text-yellow-700',
      icon: Clock,
    },
    processing: {
      label: 'Processing',
      className: 'bg-blue-50 text-blue-700',
      icon: Clock,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-50 text-red-700',
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

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

  const stats = {
    totalGross: demoPayroll.reduce((sum, p) => sum + p.grossAmount, 0),
    totalDeductions: demoPayroll.reduce((sum, p) => sum + p.deductions, 0),
    totalNet: demoPayroll.reduce((sum, p) => sum + p.netAmount, 0),
    paid: demoPayroll.filter((p) => p.status === 'paid').length,
    pending: demoPayroll.filter((p) => p.status === 'pending').length,
    processing: demoPayroll.filter((p) => p.status === 'processing').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-1">
            Manage employee wages and payment processing
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            <Download size={20} />
            Export
          </button>
          {canProcessPayroll && (
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
              <Wallet size={20} />
              Process Payroll
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Gross</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatCurrency(stats.totalGross)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Deductions</p>
          <p className="text-xl font-semibold text-red-600">
            -{formatCurrency(stats.totalDeductions)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Net Payable</p>
          <p className="text-xl font-semibold text-green-600">
            {formatCurrency(stats.totalNet)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Payment Status</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm">
              <span className="font-semibold text-green-600">{stats.paid}</span> Paid
            </span>
            <span className="text-sm">
              <span className="font-semibold text-yellow-600">{stats.pending}</span> Pending
            </span>
            <span className="text-sm">
              <span className="font-semibold text-blue-600">{stats.processing}</span> Processing
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg">
            <Calendar size={18} className="text-gray-400" />
            <select className="outline-none text-sm bg-transparent">
              <option value="2026-01">January 2026</option>
              <option value="2025-12">December 2025</option>
              <option value="2025-11">November 2025</option>
            </select>
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm">
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm">
            <option value="">All Departments</option>
            <option value="operations">Operations</option>
            <option value="hr">Human Resources</option>
            <option value="marketing">Marketing</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Filter size={16} />
            More Filters
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gross
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deductions
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Amount
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {demoPayroll.map((record) => (
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
                      <p className="text-xs text-gray-500">{record.position}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(record.periodStart)} - {formatDate(record.periodEnd)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                  {formatCurrency(record.grossAmount)}
                </td>
                <td className="px-6 py-4 text-sm text-red-600 text-right">
                  -{formatCurrency(record.deductions)}
                </td>
                <td className="px-6 py-4 text-sm text-green-600 text-right font-semibold">
                  {formatCurrency(record.netAmount)}
                </td>
                <td className="px-6 py-4">
                  <PaymentStatusBadge status={record.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(record.paymentDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to{' '}
            <span className="font-medium">{demoPayroll.length}</span> records
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
