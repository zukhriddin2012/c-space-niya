'use client';

import { useState, useMemo } from 'react';
import {
  Banknote,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';

interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_position: string;
  legal_entity: string;
  net_salary: number;
}

interface PaymentRequest {
  id: string;
  request_type: 'advance' | 'wage';
  total_amount: number;
  employee_count: number;
  status: string;
  created_at: string;
  notes: string | null;
}

interface Summary {
  advance: {
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    paid: number;
    totalAmount: number;
    paidAmount: number;
  };
  wage: {
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    paid: number;
    totalAmount: number;
    paidAmount: number;
  };
  requests: PaymentRequest[];
}

interface PaymentRequestsSectionProps {
  year: number;
  month: number;
  payroll: PayrollRecord[];
  summary: Summary;
  canProcess: boolean;
  canApprove: boolean;
}

type SortField = 'name' | 'position' | 'entity' | 'salary' | 'advance' | 'wage';
type SortDirection = 'asc' | 'desc' | null;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function formatNumber(amount: number) {
  return new Intl.NumberFormat('uz-UZ').format(amount);
}

function getMonthName(month: number, year: number) {
  return new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function RequestStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ComponentType<{ size?: number }> }> = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: Clock },
    pending_approval: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
    approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700', icon: XCircle },
    paid: { label: 'Paid', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  };

  const cfg = config[status] || config.draft;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

// Sortable column header component
function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
  icon,
  align = 'left',
}: {
  label: string;
  field: SortField;
  currentSort: SortField | null;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  icon?: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const isActive = currentSort === field;

  return (
    <th
      className={`px-4 py-2 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(field)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {icon}
        {label}
        <span className="ml-1">
          {isActive && currentDirection === 'asc' ? (
            <ChevronUp size={14} className="text-purple-600" />
          ) : isActive && currentDirection === 'desc' ? (
            <ChevronDown size={14} className="text-purple-600" />
          ) : (
            <ChevronsUpDown size={14} className="text-gray-300" />
          )}
        </span>
      </span>
    </th>
  );
}

export default function PaymentRequestsSection({
  year,
  month,
  payroll,
  summary,
  canProcess,
  canApprove,
}: PaymentRequestsSectionProps) {
  // State for the table-based input
  const [advanceAmounts, setAdvanceAmounts] = useState<Record<string, number>>({});
  const [wageAmounts, setWageAmounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState<'advance' | 'wage' | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Calculate totals
  const totalNetSalary = payroll.reduce((sum, p) => sum + p.net_salary, 0);
  const advancePaid = summary.advance.paidAmount;
  const wagePaid = summary.wage.paidAmount;

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort employees
  const filteredAndSortedPayroll = useMemo(() => {
    let result = [...payroll];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.employee_name.toLowerCase().includes(query) ||
          p.employee_position.toLowerCase().includes(query) ||
          p.legal_entity.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        switch (sortField) {
          case 'name':
            aVal = a.employee_name.toLowerCase();
            bVal = b.employee_name.toLowerCase();
            break;
          case 'position':
            aVal = a.employee_position.toLowerCase();
            bVal = b.employee_position.toLowerCase();
            break;
          case 'entity':
            aVal = a.legal_entity.toLowerCase();
            bVal = b.legal_entity.toLowerCase();
            break;
          case 'salary':
            aVal = a.net_salary;
            bVal = b.net_salary;
            break;
          case 'advance':
            aVal = advanceAmounts[a.employee_id] || 0;
            bVal = advanceAmounts[b.employee_id] || 0;
            break;
          case 'wage':
            aVal = wageAmounts[a.employee_id] || 0;
            bVal = wageAmounts[b.employee_id] || 0;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [payroll, searchQuery, sortField, sortDirection, advanceAmounts, wageAmounts]);

  // Calculate totals for input amounts
  const totalAdvanceInput = Object.values(advanceAmounts).reduce((sum, amt) => sum + (amt || 0), 0);
  const totalWageInput = Object.values(wageAmounts).reduce((sum, amt) => sum + (amt || 0), 0);
  const advanceCount = Object.values(advanceAmounts).filter(amt => amt > 0).length;
  const wageCount = Object.values(wageAmounts).filter(amt => amt > 0).length;

  const handleAdvanceChange = (employeeId: string, value: string) => {
    const amount = parseInt(value.replace(/\D/g, '')) || 0;
    setAdvanceAmounts(prev => ({ ...prev, [employeeId]: amount }));
  };

  const handleWageChange = (employeeId: string, value: string) => {
    const amount = parseInt(value.replace(/\D/g, '')) || 0;
    setWageAmounts(prev => ({ ...prev, [employeeId]: amount }));
  };

  // Quick fill functions
  const fillAllAdvance = (percentage: number) => {
    const newAmounts: Record<string, number> = {};
    payroll.forEach(p => {
      newAmounts[p.employee_id] = Math.round(p.net_salary * percentage);
    });
    setAdvanceAmounts(newAmounts);
  };

  const fillAllWage = () => {
    const newAmounts: Record<string, number> = {};
    payroll.forEach(p => {
      // Wage = Net salary - advance amount for this employee
      const advance = advanceAmounts[p.employee_id] || 0;
      newAmounts[p.employee_id] = Math.max(0, p.net_salary - advance);
    });
    setWageAmounts(newAmounts);
  };

  const clearAdvance = () => setAdvanceAmounts({});
  const clearWage = () => setWageAmounts({});

  const handleCreateRequest = async (type: 'advance' | 'wage') => {
    const amounts = type === 'advance' ? advanceAmounts : wageAmounts;
    const items = Object.entries(amounts)
      .filter(([, amount]) => amount > 0)
      .map(([employeeId, amount]) => {
        const emp = payroll.find(p => p.employee_id === employeeId);
        return {
          employee_id: employeeId,
          amount,
          net_salary: emp?.net_salary || 0,
        };
      });

    if (items.length === 0) {
      alert(`Please enter ${type} amounts for at least one employee`);
      return;
    }

    setCreating(type);
    try {
      const response = await fetch('/api/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: type,
          year,
          month,
          items,
        }),
      });

      if (response.ok) {
        if (type === 'advance') {
          setAdvanceAmounts({});
        } else {
          setWageAmounts({});
        }
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create payment request');
      }
    } catch {
      alert('An error occurred');
    } finally {
      setCreating(null);
    }
  };

  const handleAction = async (requestId: string, action: 'submit' | 'approve' | 'reject' | 'pay') => {
    setActionLoading(`${requestId}-${action}`);
    try {
      let body = {};

      if (action === 'reject') {
        const reason = prompt('Please enter rejection reason:');
        if (!reason) {
          setActionLoading(null);
          return;
        }
        body = { reason };
      }

      const response = await fetch(`/api/payment-requests/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${action} request`);
      }
    } catch {
      alert('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Payment Flow Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="flex-shrink-0 text-center px-4">
            <p className="text-xs text-gray-500">Total Net</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalNetSalary)}</p>
          </div>
          <ArrowRight className="text-gray-300 flex-shrink-0" size={20} />
          <div className="flex-shrink-0 text-center px-4 py-2 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600">Advance Paid</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(advancePaid)}</p>
          </div>
          <ArrowRight className="text-gray-300 flex-shrink-0" size={20} />
          <div className="flex-shrink-0 text-center px-4 py-2 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600">Wage Paid</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(wagePaid)}</p>
          </div>
          <ArrowRight className="text-gray-300 flex-shrink-0" size={20} />
          <div className="flex-shrink-0 text-center px-4 py-2 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600">Remaining</p>
            <p className="text-lg font-bold text-purple-600">{formatCurrency(totalNetSalary - advancePaid - wagePaid)}</p>
          </div>
        </div>
      </div>

      {/* Payment Requests List */}
      {summary.requests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Payment Requests for {getMonthName(month, year)}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {summary.requests.map(request => (
              <div key={request.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    request.request_type === 'advance' ? 'bg-orange-100' : 'bg-green-100'
                  }`}>
                    {request.request_type === 'advance' ? (
                      <Banknote size={16} className="text-orange-600" />
                    ) : (
                      <Wallet size={16} className="text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {request.request_type === 'advance' ? 'Advance' : 'Wage'} • {request.employee_count} employees
                    </p>
                    <p className="text-xs text-gray-500">{formatCurrency(request.total_amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RequestStatusBadge status={request.status} />
                  {request.status === 'draft' && canProcess && (
                    <button
                      onClick={() => handleAction(request.id, 'submit')}
                      disabled={!!actionLoading}
                      className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      {actionLoading === `${request.id}-submit` ? <Loader2 size={12} className="animate-spin" /> : 'Submit'}
                    </button>
                  )}
                  {request.status === 'pending_approval' && canApprove && (
                    <>
                      <button
                        onClick={() => handleAction(request.id, 'approve')}
                        disabled={!!actionLoading}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === `${request.id}-approve` ? <Loader2 size={12} className="animate-spin" /> : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleAction(request.id, 'reject')}
                        disabled={!!actionLoading}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === `${request.id}-reject` ? <Loader2 size={12} className="animate-spin" /> : 'Reject'}
                      </button>
                    </>
                  )}
                  {request.status === 'approved' && canProcess && (
                    <button
                      onClick={() => handleAction(request.id, 'pay')}
                      disabled={!!actionLoading}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading === `${request.id}-pay` ? <Loader2 size={12} className="animate-spin" /> : 'Mark Paid'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Payment Table */}
      {canProcess && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Create Payment Request</h3>
            <div className="flex items-center gap-3">
              {sortField && (
                <button
                  onClick={() => {
                    setSortField(null);
                    setSortDirection(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear sort
                </button>
              )}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm w-64"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Advance:</span>
              <button onClick={() => fillAllAdvance(0.3)} className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200">30%</button>
              <button onClick={() => fillAllAdvance(0.5)} className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200">50%</button>
              <button onClick={clearAdvance} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Clear</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Wage:</span>
              <button onClick={fillAllWage} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Fill Remaining</button>
              <button onClick={clearWage} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Clear</button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <SortableHeader
                    label="Employee"
                    field="name"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Position"
                    field="position"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Legal Entity"
                    field="entity"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Net Salary"
                    field="salary"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Advance"
                    field="advance"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    icon={<Banknote size={14} className="text-orange-500" />}
                    align="right"
                  />
                  <SortableHeader
                    label="Wage"
                    field="wage"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    icon={<Wallet size={14} className="text-green-500" />}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSortedPayroll.map(employee => {
                  const advance = advanceAmounts[employee.employee_id] || 0;
                  const wage = wageAmounts[employee.employee_id] || 0;

                  return (
                    <tr key={employee.employee_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900 text-sm">{employee.employee_name}</p>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{employee.employee_position}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{employee.legal_entity}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(employee.net_salary)}
                      </td>
                      <td className="px-4 py-2 w-36">
                        <input
                          type="text"
                          value={advance > 0 ? formatNumber(advance) : ''}
                          onChange={(e) => handleAdvanceChange(employee.employee_id, e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </td>
                      <td className="px-4 py-2 w-36">
                        <input
                          type="text"
                          value={wage > 0 ? formatNumber(wage) : ''}
                          onChange={(e) => handleWageChange(employee.employee_id, e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-sm text-gray-700" colSpan={3}>
                    Total ({payroll.length} employees)
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(totalNetSalary)}
                  </td>
                  <td className="px-4 py-3 text-sm text-orange-600 text-right">
                    {formatCurrency(totalAdvanceInput)}
                    {advanceCount > 0 && <span className="text-xs text-gray-500 ml-1">({advanceCount})</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-green-600 text-right">
                    {formatCurrency(totalWageInput)}
                    {wageCount > 0 && <span className="text-xs text-gray-500 ml-1">({wageCount})</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Submit Buttons */}
          <div className="px-4 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => handleCreateRequest('advance')}
              disabled={creating !== null || totalAdvanceInput === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating === 'advance' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Banknote size={18} />
              )}
              Create Advance Request
              {totalAdvanceInput > 0 && (
                <span className="bg-orange-500 px-2 py-0.5 rounded text-xs">
                  {formatCurrency(totalAdvanceInput)}
                </span>
              )}
            </button>
            <button
              onClick={() => handleCreateRequest('wage')}
              disabled={creating !== null || totalWageInput === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating === 'wage' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Wallet size={18} />
              )}
              Create Wage Request
              {totalWageInput > 0 && (
                <span className="bg-green-500 px-2 py-0.5 rounded text-xs">
                  {formatCurrency(totalWageInput)}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
