'use client';

import { useState } from 'react';
import {
  Banknote,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Plus,
  X,
  Loader2,
  ArrowRight,
  AlertCircle,
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
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
    pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
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

export default function PaymentRequestsSection({
  year,
  month,
  payroll,
  summary,
  canProcess,
  canApprove,
}: PaymentRequestsSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'advance' | 'wage'>('advance');
  const [selectedEmployees, setSelectedEmployees] = useState<Map<string, number>>(new Map());
  const [creating, setCreating] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalNetSalary = payroll.reduce((sum, p) => sum + p.net_salary, 0);
  const advancePaid = summary.advance.paidAmount;
  const wagePaid = summary.wage.paidAmount;
  const remainingWage = totalNetSalary - advancePaid - wagePaid;

  const handleToggleEmployee = (employeeId: string, netSalary: number) => {
    const newSelected = new Map(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      // For advance, start with a suggested amount (e.g., 50% of net salary)
      // For wage, use remaining after advance
      const amount = createType === 'advance' ? Math.round(netSalary * 0.5) : netSalary;
      newSelected.set(employeeId, amount);
    }
    setSelectedEmployees(newSelected);
  };

  const handleAmountChange = (employeeId: string, amount: number) => {
    const newSelected = new Map(selectedEmployees);
    newSelected.set(employeeId, amount);
    setSelectedEmployees(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEmployees.size === payroll.length) {
      setSelectedEmployees(new Map());
    } else {
      const newSelected = new Map<string, number>();
      payroll.forEach(p => {
        const amount = createType === 'advance' ? Math.round(p.net_salary * 0.5) : p.net_salary;
        newSelected.set(p.employee_id, amount);
      });
      setSelectedEmployees(newSelected);
    }
  };

  const handleCreateRequest = async () => {
    if (selectedEmployees.size === 0) return;

    setCreating(true);
    try {
      const items = Array.from(selectedEmployees.entries()).map(([employeeId, amount]) => {
        const emp = payroll.find(p => p.employee_id === employeeId);
        return {
          employee_id: employeeId,
          amount,
          net_salary: emp?.net_salary || 0,
        };
      });

      const response = await fetch('/api/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: createType,
          year,
          month,
          notes,
          items,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setSelectedEmployees(new Map());
        setNotes('');
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create payment request');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (requestId: string, action: 'submit' | 'approve' | 'reject' | 'pay') => {
    setActionLoading(`${requestId}-${action}`);
    try {
      let url = `/api/payment-requests/${requestId}/${action}`;
      let body = {};

      if (action === 'reject') {
        const reason = prompt('Please enter rejection reason:');
        if (!reason) {
          setActionLoading(null);
          return;
        }
        body = { reason };
      }

      const response = await fetch(url, {
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
    } catch (error) {
      alert('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const totalSelected = Array.from(selectedEmployees.values()).reduce((sum, amt) => sum + amt, 0);

  return (
    <>
      {/* Payment Flow Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Flow for {getMonthName(month, year)}</h3>

        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {/* Total Net Payable */}
          <div className="flex-shrink-0 bg-gray-50 rounded-lg p-4 min-w-[180px]">
            <p className="text-xs text-gray-500 mb-1">Total Net Payable</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalNetSalary)}</p>
          </div>

          <ArrowRight className="text-gray-300 flex-shrink-0" size={24} />

          {/* Advance Payment */}
          <div className="flex-shrink-0 bg-orange-50 rounded-lg p-4 min-w-[180px]">
            <div className="flex items-center gap-2 mb-1">
              <Banknote size={16} className="text-orange-600" />
              <p className="text-xs text-gray-500">Advance Payment</p>
            </div>
            <p className="text-lg font-semibold text-orange-600">{formatCurrency(advancePaid)}</p>
            {summary.advance.pending > 0 && (
              <p className="text-xs text-orange-500 mt-1">
                {summary.advance.pending} pending approval
              </p>
            )}
          </div>

          <ArrowRight className="text-gray-300 flex-shrink-0" size={24} />

          {/* Wage Payment */}
          <div className="flex-shrink-0 bg-green-50 rounded-lg p-4 min-w-[180px]">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-green-600" />
              <p className="text-xs text-gray-500">Wage Payment</p>
            </div>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(wagePaid)}</p>
            {summary.wage.pending > 0 && (
              <p className="text-xs text-green-500 mt-1">
                {summary.wage.pending} pending approval
              </p>
            )}
          </div>

          <ArrowRight className="text-gray-300 flex-shrink-0" size={24} />

          {/* Remaining */}
          <div className="flex-shrink-0 bg-purple-50 rounded-lg p-4 min-w-[180px]">
            <p className="text-xs text-gray-500 mb-1">Remaining</p>
            <p className={`text-lg font-semibold ${remainingWage > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
              {formatCurrency(remainingWage)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {canProcess && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                setCreateType('advance');
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Banknote size={18} />
              Create Advance Request
            </button>
            <button
              onClick={() => {
                setCreateType('wage');
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Wallet size={18} />
              Create Wage Request
            </button>
          </div>
        )}
      </div>

      {/* Payment Requests List */}
      {summary.requests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Payment Requests</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {summary.requests.map(request => (
              <div key={request.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    request.request_type === 'advance' ? 'bg-orange-100' : 'bg-green-100'
                  }`}>
                    {request.request_type === 'advance' ? (
                      <Banknote size={20} className="text-orange-600" />
                    ) : (
                      <Wallet size={20} className="text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.request_type === 'advance' ? 'Advance Payment' : 'Wage Payment'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {request.employee_count} employees • {formatCurrency(request.total_amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RequestStatusBadge status={request.status} />

                  {/* Action buttons based on status and permissions */}
                  {request.status === 'draft' && canProcess && (
                    <button
                      onClick={() => handleAction(request.id, 'submit')}
                      disabled={actionLoading === `${request.id}-submit`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {actionLoading === `${request.id}-submit` ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      Submit
                    </button>
                  )}

                  {request.status === 'pending_approval' && canApprove && (
                    <>
                      <button
                        onClick={() => handleAction(request.id, 'approve')}
                        disabled={!!actionLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === `${request.id}-approve` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(request.id, 'reject')}
                        disabled={!!actionLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === `${request.id}-reject` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <XCircle size={14} />
                        )}
                        Reject
                      </button>
                    </>
                  )}

                  {request.status === 'approved' && canProcess && (
                    <button
                      onClick={() => handleAction(request.id, 'pay')}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading === `${request.id}-pay` ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Payment Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Create {createType === 'advance' ? 'Advance' : 'Wage'} Payment Request
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {getMonthName(month, year)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedEmployees(new Map());
                  setNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Type toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setCreateType('advance');
                    setSelectedEmployees(new Map());
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    createType === 'advance'
                      ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                  }`}
                >
                  <Banknote size={18} className="inline mr-2" />
                  Advance Payment
                </button>
                <button
                  onClick={() => {
                    setCreateType('wage');
                    setSelectedEmployees(new Map());
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    createType === 'wage'
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                  }`}
                >
                  <Wallet size={18} className="inline mr-2" />
                  Wage Payment
                </button>
              </div>

              {/* Select all */}
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.size === payroll.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Select All Employees</span>
                </label>
                <span className="text-sm text-gray-500">
                  {selectedEmployees.size} selected
                </span>
              </div>

              {/* Employee list */}
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {payroll.map(employee => {
                  const isSelected = selectedEmployees.has(employee.employee_id);
                  const amount = selectedEmployees.get(employee.employee_id) || 0;

                  return (
                    <div
                      key={employee.employee_id}
                      className={`p-3 flex items-center gap-4 ${isSelected ? 'bg-purple-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleEmployee(employee.employee_id, employee.net_salary)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{employee.employee_name}</p>
                        <p className="text-xs text-gray-500">{employee.employee_position}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Net: {formatCurrency(employee.net_salary)}</p>
                      </div>
                      {isSelected && (
                        <div className="w-36">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => handleAmountChange(employee.employee_id, parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right"
                            min={0}
                            max={employee.net_salary}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes for this payment request..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows={2}
                />
              </div>

              {/* Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="text-lg font-semibold text-gray-900">{formatCurrency(totalSelected)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">Employees:</span>
                  <span className="text-sm font-medium text-gray-700">{selectedEmployees.size}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedEmployees(new Map());
                  setNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={creating || selectedEmployees.size === 0}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
                  createType === 'advance' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {creating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Create Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
