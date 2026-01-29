'use client';

import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Wallet,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Building2,
  MapPin,
} from 'lucide-react';
import { ConfirmationDialog, InputDialog } from '@/components/ui';

interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_position: string;
  legal_entity: string;
  wage_category: 'primary' | 'additional';
  net_salary: number;
}

interface GroupedEmployee {
  employee_id: string;
  employee_name: string;
  employee_position: string;
  totalNet: number;
  advancePaid: number;
  wageRecords: PayrollRecord[];
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
  paidAdvances: Record<string, number>;
  canProcess: boolean;
  canApprove: boolean;
}

type SortField = 'name' | 'position' | 'entity' | 'salary' | 'advancePaid' | 'advance' | 'wage';
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
  paidAdvances,
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

  // Expanded rows state for hybrid view
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  const toggleExpanded = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(payroll.map(p => p.employee_id));
    setExpandedEmployees(allIds);
  };

  const collapseAll = () => {
    setExpandedEmployees(new Set());
  };

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    requestId: string;
    action: 'submit' | 'approve' | 'pay';
    type: 'advance' | 'wage';
    amount: number;
    employeeCount: number;
  } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    isOpen: boolean;
    requestId: string;
    type: 'advance' | 'wage';
    amount: number;
  } | null>(null);

  // Calculate totals
  const totalNetSalary = payroll.reduce((sum, p) => sum + p.net_salary, 0);
  const advancePaid = summary.advance.paidAmount;
  const wagePaid = summary.wage.paidAmount;

  // Handle sort - cycle through: null -> asc -> desc -> null
  const handleSort = (field: SortField) => {
    if (sortField !== field) {
      // New field - start with ascending
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      // Same field, currently asc - switch to desc
      setSortDirection('desc');
    } else if (sortDirection === 'desc') {
      // Same field, currently desc - clear sort
      setSortField(null);
      setSortDirection(null);
    } else {
      // Same field but no direction (shouldn't happen) - set to asc
      setSortDirection('asc');
    }
  };

  // Filter payroll by search query
  const filteredPayroll = useMemo(() => {
    if (!searchQuery.trim()) {
      return payroll;
    }

    const query = searchQuery.toLowerCase();
    return payroll.filter(
      p =>
        p.employee_name.toLowerCase().includes(query) ||
        p.employee_position.toLowerCase().includes(query) ||
        p.legal_entity.toLowerCase().includes(query)
    );
  }, [payroll, searchQuery]);

  // Group payroll by employee for hybrid view
  const groupedEmployees = useMemo(() => {
    const map = new Map<string, GroupedEmployee>();

    for (const record of filteredPayroll) {
      const existing = map.get(record.employee_id);
      if (existing) {
        existing.totalNet += record.net_salary;
        existing.wageRecords.push(record);
      } else {
        map.set(record.employee_id, {
          employee_id: record.employee_id,
          employee_name: record.employee_name,
          employee_position: record.employee_position,
          totalNet: record.net_salary,
          advancePaid: paidAdvances[record.employee_id] || 0,
          wageRecords: [record],
        });
      }
    }

    // Sort wage records within each employee: Primary first, then Additional
    for (const emp of map.values()) {
      emp.wageRecords.sort((a, b) => {
        if (a.wage_category === 'primary' && b.wage_category === 'additional') return -1;
        if (a.wage_category === 'additional' && b.wage_category === 'primary') return 1;
        return 0;
      });
    }

    // Convert to array and apply sorting
    let result = Array.from(map.values());

    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'name':
            comparison = (a.employee_name || '').localeCompare(b.employee_name || '');
            break;
          case 'position':
            comparison = (a.employee_position || '').localeCompare(b.employee_position || '');
            break;
          case 'salary':
            // Sort by combined total for the employee
            comparison = a.totalNet - b.totalNet;
            break;
          case 'advancePaid':
            comparison = a.advancePaid - b.advancePaid;
            break;
          case 'advance':
            // Sort by total advance input for this employee
            const aAdvance = a.wageRecords.reduce((sum, r) => sum + (advanceAmounts[r.id] || 0), 0);
            const bAdvance = b.wageRecords.reduce((sum, r) => sum + (advanceAmounts[r.id] || 0), 0);
            comparison = aAdvance - bAdvance;
            break;
          case 'wage':
            // Sort by total wage input for this employee
            const aWage = a.wageRecords.reduce((sum, r) => sum + (wageAmounts[r.id] || 0), 0);
            const bWage = b.wageRecords.reduce((sum, r) => sum + (wageAmounts[r.id] || 0), 0);
            comparison = aWage - bWage;
            break;
        }

        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [filteredPayroll, paidAdvances, sortField, sortDirection, advanceAmounts, wageAmounts]);

  // Calculate totals by category
  const primaryNetTotal = filteredPayroll
    .filter(p => p.wage_category === 'primary')
    .reduce((sum, p) => sum + p.net_salary, 0);
  const additionalNetTotal = filteredPayroll
    .filter(p => p.wage_category === 'additional')
    .reduce((sum, p) => sum + p.net_salary, 0);

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

  // Quick fill functions - use record ID (employee + entity)
  const fillAllAdvance = (percentage: number) => {
    const newAmounts: Record<string, number> = {};
    payroll.forEach(p => {
      newAmounts[p.id] = Math.round(p.net_salary * percentage);
    });
    setAdvanceAmounts(newAmounts);
  };

  const fillAllWage = () => {
    const newAmounts: Record<string, number> = {};
    payroll.forEach(p => {
      // Wage = Net salary - paid advance - pending advance input
      const paidAdvance = paidAdvances[p.employee_id] || 0;
      const pendingAdvance = advanceAmounts[p.id] || 0;
      newAmounts[p.id] = Math.max(0, p.net_salary - paidAdvance - pendingAdvance);
    });
    setWageAmounts(newAmounts);
  };

  const clearAdvance = () => setAdvanceAmounts({});
  const clearWage = () => setWageAmounts({});

  const handleCreateRequest = async (type: 'advance' | 'wage') => {
    const amounts = type === 'advance' ? advanceAmounts : wageAmounts;
    const items = Object.entries(amounts)
      .filter(([, amount]) => amount > 0)
      .map(([recordId, amount]) => {
        // recordId is the unique record ID (p.id), find the payroll entry
        const emp = payroll.find(p => p.id === recordId);
        return {
          employee_id: emp?.employee_id || recordId,
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

  // Open confirmation dialog for an action
  const openConfirmDialog = (requestId: string, action: 'submit' | 'approve' | 'pay', request: PaymentRequest) => {
    setConfirmDialog({
      isOpen: true,
      requestId,
      action,
      type: request.request_type,
      amount: request.total_amount,
      employeeCount: request.employee_count,
    });
  };

  // Open reject dialog
  const openRejectDialog = (requestId: string, request: PaymentRequest) => {
    setRejectDialog({
      isOpen: true,
      requestId,
      type: request.request_type,
      amount: request.total_amount,
    });
  };

  // Execute the confirmed action
  const executeAction = async (requestId: string, action: 'submit' | 'approve' | 'pay', body: object = {}) => {
    setActionLoading(`${requestId}-${action}`);
    try {
      const response = await fetch(`/api/payment-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
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
      setConfirmDialog(null);
    }
  };

  // Execute rejection with reason
  const executeReject = async (requestId: string, reason: string) => {
    setActionLoading(`${requestId}-reject`);
    try {
      const response = await fetch(`/api/payment-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject request');
      }
    } catch {
      alert('An error occurred');
    } finally {
      setActionLoading(null);
      setRejectDialog(null);
    }
  };

  // Get dialog configuration based on action
  const getDialogConfig = (action: 'submit' | 'approve' | 'pay', type: 'advance' | 'wage', amount: number, employeeCount: number) => {
    const typeLabel = type === 'advance' ? 'Advance' : 'Wage';
    const amountFormatted = formatCurrency(amount);

    switch (action) {
      case 'submit':
        return {
          title: `Submit ${typeLabel} Request?`,
          message: `You are about to submit a ${typeLabel.toLowerCase()} payment request for ${employeeCount} employee${employeeCount > 1 ? 's' : ''} totaling ${amountFormatted}. This will send it for approval.`,
          confirmText: 'Submit for Approval',
          variant: 'info' as const,
        };
      case 'approve':
        return {
          title: `Approve ${typeLabel} Request?`,
          message: `You are about to approve a ${typeLabel.toLowerCase()} payment request for ${employeeCount} employee${employeeCount > 1 ? 's' : ''} totaling ${amountFormatted}. Once approved, it can be marked as paid.`,
          confirmText: 'Approve Request',
          variant: 'success' as const,
        };
      case 'pay':
        return {
          title: `Mark as Paid?`,
          message: `You are about to mark this ${typeLabel.toLowerCase()} payment request as paid. This confirms that ${amountFormatted} has been disbursed to ${employeeCount} employee${employeeCount > 1 ? 's' : ''}. This action cannot be undone.`,
          confirmText: 'Confirm Payment',
          variant: 'warning' as const,
        };
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
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Payment Requests for {getMonthName(month, year)}</h3>
            <a
              href={`/api/payment-requests/export?year=${year}&month=${month}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <FileSpreadsheet size={14} />
              Export Excel
            </a>
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
                      onClick={() => openConfirmDialog(request.id, 'submit', request)}
                      disabled={!!actionLoading}
                      className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      {actionLoading === `${request.id}-submit` ? <Loader2 size={12} className="animate-spin" /> : 'Submit'}
                    </button>
                  )}
                  {request.status === 'pending_approval' && canApprove && (
                    <>
                      <button
                        onClick={() => openConfirmDialog(request.id, 'approve', request)}
                        disabled={!!actionLoading}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === `${request.id}-approve` ? <Loader2 size={12} className="animate-spin" /> : 'Approve'}
                      </button>
                      <button
                        onClick={() => openRejectDialog(request.id, request)}
                        disabled={!!actionLoading}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === `${request.id}-reject` ? <Loader2 size={12} className="animate-spin" /> : 'Reject'}
                      </button>
                    </>
                  )}
                  {request.status === 'approved' && canProcess && (
                    <button
                      onClick={() => openConfirmDialog(request.id, 'pay', request)}
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

      {/* Search and Quick Actions Bar */}
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

          {/* Submit Buttons */}
          <div className="px-4 py-3 bg-gray-50 flex justify-end gap-3">
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

      {/* Employee Wages Table (Hybrid View) */}
      {canProcess && groupedEmployees.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Employee Wages</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  <Building2 size={12} /> Primary: {formatCurrency(primaryNetTotal)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  <MapPin size={12} /> Additional: {formatCurrency(additionalNetTotal)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
              >
                Expand all
              </button>
              <button
                onClick={collapseAll}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
              >
                Collapse all
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                  <SortableHeader label="Employee" field="name" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Position" field="position" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <SortableHeader label="Total Net" field="salary" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Paid" field="advancePaid" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} icon={<CheckCircle size={14} className="text-blue-500" />} align="right" />
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Banknote size={14} className="text-orange-500" />
                      Advance
                    </span>
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Wallet size={14} className="text-green-500" />
                      Wage
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupedEmployees.map(employee => {
                  const isExpanded = expandedEmployees.has(employee.employee_id);
                  const hasMultipleRecords = employee.wageRecords.length > 1;

                  // Calculate combined advance/wage totals for this employee
                  const employeeTotalAdvance = employee.wageRecords.reduce(
                    (sum, r) => sum + (advanceAmounts[r.id] || 0), 0
                  );
                  const employeeTotalWage = employee.wageRecords.reduce(
                    (sum, r) => sum + (wageAmounts[r.id] || 0), 0
                  );

                  return (
                    <React.Fragment key={employee.employee_id}>
                      {/* Main Employee Row */}
                      <tr
                        className={`border-b border-gray-100 ${hasMultipleRecords ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50/50'} ${isExpanded ? 'bg-purple-50/30' : ''}`}
                        onClick={hasMultipleRecords ? () => toggleExpanded(employee.employee_id) : undefined}
                      >
                        <td className="px-4 py-2.5 w-8">
                          {hasMultipleRecords ? (
                            <ChevronRight
                              size={16}
                              className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          ) : (
                            <span className="w-4" />
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900 text-sm">{employee.employee_name}</p>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-500">{employee.employee_position}</td>
                        <td className="px-4 py-2.5 text-sm">
                          {hasMultipleRecords ? (
                            <span className="text-gray-400 text-xs">{employee.wageRecords.length} sources</span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {employee.wageRecords[0].wage_category === 'primary' ? (
                                <>
                                  <Building2 size={14} className="text-indigo-500" />
                                  <span className="text-gray-600">{employee.wageRecords[0].legal_entity}</span>
                                </>
                              ) : (
                                <>
                                  <MapPin size={14} className="text-emerald-500" />
                                  <span className="text-gray-600">{employee.wageRecords[0].legal_entity}</span>
                                </>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900">
                          {formatCurrency(employee.totalNet)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right">
                          {employee.advancePaid > 0 ? (
                            <span className="text-blue-600 font-medium">{formatNumber(employee.advancePaid)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        {/* Input fields in main row only if single record and not expanded */}
                        {!hasMultipleRecords && !isExpanded ? (
                          <>
                            <td className="px-4 py-2 w-36" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={advanceAmounts[employee.wageRecords[0].id] > 0 ? formatNumber(advanceAmounts[employee.wageRecords[0].id]) : ''}
                                onChange={(e) => handleAdvanceChange(employee.wageRecords[0].id, e.target.value)}
                                placeholder="0"
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </td>
                            <td className="px-4 py-2 w-36" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={wageAmounts[employee.wageRecords[0].id] > 0 ? formatNumber(wageAmounts[employee.wageRecords[0].id]) : ''}
                                onChange={(e) => handleWageChange(employee.wageRecords[0].id, e.target.value)}
                                placeholder="0"
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5 text-sm text-right">
                              {employeeTotalAdvance > 0 ? (
                                <span className="text-orange-600 font-medium">{formatNumber(employeeTotalAdvance)}</span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right">
                              {employeeTotalWage > 0 ? (
                                <span className="text-green-600 font-medium">{formatNumber(employeeTotalWage)}</span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Expanded Sub-rows for wage breakdown */}
                      {isExpanded && employee.wageRecords.map((record, idx) => {
                        const advance = advanceAmounts[record.id] || 0;
                        const wage = wageAmounts[record.id] || 0;
                        const isLast = idx === employee.wageRecords.length - 1;
                        const isPrimary = record.wage_category === 'primary';

                        return (
                          <tr
                            key={record.id}
                            className={`${isLast ? 'border-b border-gray-200' : 'border-b border-gray-50'} ${isPrimary ? 'bg-indigo-50/30' : 'bg-emerald-50/30'}`}
                          >
                            <td className="px-4 py-2 w-8">
                              <span className="text-gray-300 pl-1">{isLast ? '└' : '├'}</span>
                            </td>
                            <td className="px-4 py-2" colSpan={2}>
                              <span className={`inline-flex items-center gap-1.5 text-sm ${isPrimary ? 'text-indigo-700' : 'text-emerald-700'}`}>
                                {isPrimary ? (
                                  <>
                                    <Building2 size={14} />
                                    <span className="font-medium">Primary</span>
                                    <span className="text-xs text-gray-400">(12% tax)</span>
                                  </>
                                ) : (
                                  <>
                                    <MapPin size={14} />
                                    <span className="font-medium">Additional</span>
                                    <span className="text-xs text-gray-400">(No tax)</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {record.legal_entity}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-gray-700">
                              {formatCurrency(record.net_salary)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right">
                              <span className="text-gray-300">-</span>
                            </td>
                            <td className="px-4 py-2 w-36">
                              <input
                                type="text"
                                value={advance > 0 ? formatNumber(advance) : ''}
                                onChange={(e) => handleAdvanceChange(record.id, e.target.value)}
                                placeholder="0"
                                className={`w-full px-2 py-1.5 border rounded text-sm text-right focus:ring-2 ${
                                  isPrimary
                                    ? 'border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500'
                                    : 'border-emerald-200 focus:ring-emerald-500 focus:border-emerald-500'
                                }`}
                              />
                            </td>
                            <td className="px-4 py-2 w-36">
                              <input
                                type="text"
                                value={wage > 0 ? formatNumber(wage) : ''}
                                onChange={(e) => handleWageChange(record.id, e.target.value)}
                                placeholder="0"
                                className={`w-full px-2 py-1.5 border rounded text-sm text-right focus:ring-2 ${
                                  isPrimary
                                    ? 'border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500'
                                    : 'border-emerald-200 focus:ring-emerald-500 focus:border-emerald-500'
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-4 py-3" colSpan={4}>
                    <span className="text-sm text-gray-700">
                      Total ({groupedEmployees.length} employees)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(totalNetSalary)}
                  </td>
                  <td className="px-4 py-3 text-sm text-blue-600 text-right">
                    {Object.values(paidAdvances).reduce((sum, v) => sum + v, 0) > 0
                      ? formatNumber(Object.values(paidAdvances).reduce((sum, v) => sum + v, 0))
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-orange-600 text-right">
                    {totalAdvanceInput > 0 ? formatNumber(totalAdvanceInput) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-green-600 text-right">
                    {totalWageInput > 0 ? formatNumber(totalWageInput) : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={() => executeAction(confirmDialog.requestId, confirmDialog.action)}
          isLoading={!!actionLoading}
          {...getDialogConfig(confirmDialog.action, confirmDialog.type, confirmDialog.amount, confirmDialog.employeeCount)}
        />
      )}

      {/* Reject Dialog with Input */}
      {rejectDialog && (
        <InputDialog
          isOpen={rejectDialog.isOpen}
          onClose={() => setRejectDialog(null)}
          onConfirm={(reason) => executeReject(rejectDialog.requestId, reason)}
          title="Reject Payment Request?"
          message={`Please provide a reason for rejecting this ${rejectDialog.type} payment request of ${formatCurrency(rejectDialog.amount)}.`}
          placeholder="Enter rejection reason..."
          confirmText="Reject Request"
          isLoading={!!actionLoading}
        />
      )}
    </div>
  );
}
