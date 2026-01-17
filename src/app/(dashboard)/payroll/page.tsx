import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CheckCircle, Clock, AlertCircle, FileText, Building2, Banknote, ArrowRight } from 'lucide-react';
import { getPayrollByMonth, getPayrollStats, getPaymentRequestsSummary } from '@/lib/db';
import PayrollFilters from './PayrollFilters';
import PayrollActions from './PayrollActions';
import PaymentRequestsSection from './PaymentRequestsSection';

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
    approved: {
      label: 'Approved',
      className: 'bg-blue-50 text-blue-700',
      icon: CheckCircle,
    },
    draft: {
      label: 'Draft',
      className: 'bg-yellow-50 text-yellow-700',
      icon: Clock,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-50 text-red-700',
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status] || statusConfig.draft;
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

function getMonthName(month: number, year: number) {
  return new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; status?: string }>;
}) {
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

  // Get filter params
  const params = await searchParams;
  const currentDate = new Date();
  const selectedYear = parseInt(params.year || String(currentDate.getFullYear()));
  const selectedMonth = parseInt(params.month || String(currentDate.getMonth() + 1));
  const selectedStatus = params.status || '';

  // Fetch payroll data from database
  const [payroll, stats, paymentRequestsSummary] = await Promise.all([
    getPayrollByMonth(selectedYear, selectedMonth),
    getPayrollStats(selectedYear, selectedMonth),
    getPaymentRequestsSummary(selectedYear, selectedMonth),
  ]);

  // Apply status filter
  const filteredPayroll = selectedStatus
    ? payroll.filter(p => p.status === selectedStatus)
    : payroll;

  // Calculate period dates
  const periodStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
  const periodEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-1">
            Manage employee wages and payment processing for {getMonthName(selectedMonth, selectedYear)}
          </p>
        </div>
        <PayrollActions
          payroll={payroll}
          year={selectedYear}
          month={selectedMonth}
          canProcess={canProcessPayroll}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Gross</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatCurrency(stats.totalGross)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{stats.totalEmployees} employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Deductions</p>
          <p className="text-xl font-semibold text-red-600">
            -{formatCurrency(stats.totalDeductions)}
          </p>
          <p className="text-xs text-gray-400 mt-1">~12% tax rate</p>
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
              <span className="font-semibold text-blue-600">{stats.approved}</span> Approved
            </span>
            <span className="text-sm">
              <span className="font-semibold text-yellow-600">{stats.draft}</span> Draft
            </span>
          </div>
        </div>
      </div>

      {/* Payment Requests Section */}
      <PaymentRequestsSection
        year={selectedYear}
        month={selectedMonth}
        payroll={payroll}
        summary={paymentRequestsSummary}
        canProcess={canProcessPayroll}
        canApprove={canApprovePayroll}
      />

      {/* Filters */}
      <PayrollFilters
        currentYear={selectedYear}
        currentMonth={selectedMonth}
        currentStatus={selectedStatus}
      />

      {/* Payroll Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Legal Entity
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax (12%)
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Payable
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
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No payroll records found for {getMonthName(selectedMonth, selectedYear)}</p>
                    <p className="text-sm mt-1">Add employee wages to see payroll data</p>
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-700 text-sm font-medium">
                            {record.employee_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{record.employee_name}</p>
                          <p className="text-xs text-gray-500">{record.employee_position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{record.legal_entity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(record.gross_salary)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 text-right">
                      -{formatCurrency(record.deductions)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right font-semibold">
                      {formatCurrency(record.net_salary)}
                    </td>
                    <td className="px-6 py-4">
                      <PaymentStatusBadge status={record.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(record.payment_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to{' '}
            <span className="font-medium">{filteredPayroll.length}</span> of{' '}
            <span className="font-medium">{filteredPayroll.length}</span> records
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
