'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface LeaveRequest {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave', description: 'Regular vacation days' },
  { value: 'sick', label: 'Sick Leave', description: 'For illness or medical appointments' },
  { value: 'personal', label: 'Personal Leave', description: 'Personal matters' },
  { value: 'family', label: 'Family Emergency', description: 'Family-related emergencies' },
  { value: 'unpaid', label: 'Unpaid Leave', description: 'Leave without pay' },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 size={16} className="text-green-600" />;
    case 'rejected':
      return <XCircle size={16} className="text-red-600" />;
    case 'pending':
      return <Clock size={16} className="text-yellow-600" />;
    default:
      return <AlertCircle size={16} className="text-gray-400" />;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}

export default function MyLeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/my-portal/leaves');
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/my-portal/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setLeaveType('annual');
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchLeaves();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit leave request');
      }
    } catch (error) {
      setError('Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'rejected').length;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-5xl mx-auto space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          <Link href="/my-portal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">My Leave Requests</h1>
            <p className="text-sm lg:text-base text-gray-600 truncate">Request and manage your time off</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex-shrink-0 text-sm lg:text-base"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Request Leave</span>
          <span className="sm:hidden">Request</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 lg:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 flex items-center gap-2 lg:gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock size={16} className="lg:hidden text-yellow-600" />
            <Clock size={20} className="hidden lg:block text-yellow-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-xs lg:text-sm text-gray-500">Pending</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 flex items-center gap-2 lg:gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="lg:hidden text-green-600" />
            <CheckCircle2 size={20} className="hidden lg:block text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{approvedCount}</p>
            <p className="text-xs lg:text-sm text-gray-500">Approved</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 flex items-center gap-2 lg:gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <XCircle size={16} className="lg:hidden text-red-600" />
            <XCircle size={20} className="hidden lg:block text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{rejectedCount}</p>
            <p className="text-xs lg:text-sm text-gray-500">Rejected</p>
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-3 lg:p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 text-sm lg:text-base">All Requests</h3>
        </div>
        {loading ? (
          <div className="p-6 lg:p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : leaves.length === 0 ? (
          <div className="p-6 lg:p-8 text-center">
            <Calendar size={40} className="lg:hidden mx-auto text-gray-300 mb-4" />
            <Calendar size={48} className="hidden lg:block mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">No leave requests yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              Request your first leave
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leaves.map((leave) => (
              <div key={leave.id} className="p-3 lg:p-4 hover:bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex items-start gap-2 lg:gap-3 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(leave.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900 capitalize text-sm lg:text-base">
                          {leave.leave_type.replace('_', ' ')} Leave
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                            leave.status
                          )}`}
                        >
                          {leave.status}
                        </span>
                      </div>
                      <p className="text-xs lg:text-sm text-gray-600 mt-1">
                        <span className="hidden sm:inline">{formatDate(leave.start_date)} — {formatDate(leave.end_date)}</span>
                        <span className="sm:hidden">
                          {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-gray-400 ml-2">
                          ({calculateDays(leave.start_date, leave.end_date)} days)
                        </span>
                      </p>
                      {leave.reason && (
                        <p className="text-xs lg:text-sm text-gray-500 mt-1 truncate">"{leave.reason}"</p>
                      )}
                      {leave.review_note && leave.status !== 'pending' && (
                        <p className="text-xs lg:text-sm text-gray-500 mt-2 italic truncate">
                          Review note: {leave.review_note}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0 ml-6 sm:ml-0">
                    <span className="hidden sm:inline">Requested </span>{new Date(leave.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl p-4 lg:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900">Request Leave</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {LEAVE_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-start gap-2 lg:gap-3 p-2 lg:p-3 border rounded-lg cursor-pointer transition-colors ${
                        leaveType === type.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="leaveType"
                        value={type.value}
                        checked={leaveType === type.value}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm lg:text-base">{type.label}</p>
                        <p className="text-xs lg:text-sm text-gray-500 truncate">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={today}
                    required
                    className="w-full px-2 lg:px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || today}
                    required
                    className="w-full px-2 lg:px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 lg:p-3 rounded-lg">
                  Duration: <strong>{calculateDays(startDate, endDate)} days</strong>
                </div>
              )}

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Briefly describe your reason..."
                  className="w-full px-2 lg:px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-3 lg:px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !startDate || !endDate}
                  className="flex-1 px-3 lg:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
