'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  User,
  Building2,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getStatusLabel,
  getStatusColor,
  getRequestTypeLabel,
  getRequestTypeColor,
  getPriorityLabel,
  getPriorityColor,
  formatCurrency,
  formatRelativeTime,
  getSlaStatus,
  getSlaRemainingText,
  getSlaColor,
  transformRequestListItem,
} from '@/modules/accounting/lib/utils';
import type { AccountingRequest, AccountingRequestStatus, AccountingRequestType } from '@/modules/accounting/types';

interface RequestWithMeta extends AccountingRequest {
  requester?: { full_name: string };
  assignee?: { full_name: string };
  branch?: { name: string };
  from_entity?: { name: string };
}

export default function AllAccountingRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountingRequestStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<AccountingRequestType | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<'normal' | 'urgent' | ''>('');
  const [assignedFilter, setAssignedFilter] = useState<'me' | 'unassigned' | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const canViewAll = user && hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL);
  const canProcess = user && hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS);

  useEffect(() => {
    if (canViewAll) {
      fetchRequests();
    }
  }, [canViewAll, page, statusFilter, typeFilter, priorityFilter, sortField, sortOrder]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('requestType', typeFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (assignedFilter === 'me' && user) params.append('assignedTo', user.id);
      if (assignedFilter === 'unassigned') params.append('assignedTo', 'unassigned');
      params.append('sortField', sortField);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/accounting/requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      const transformed = (data.data || []).map((r: Record<string, unknown>) => transformRequestListItem(r));
      setRequests(transformed as RequestWithMeta[]);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setPriorityFilter('');
    setAssignedFilter('');
    setSearchQuery('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasActiveFilters = statusFilter || typeFilter || priorityFilter || assignedFilter || searchQuery;

  if (!user) return null;

  if (!canViewAll) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">You don't have permission to view all requests.</p>
        <Link href="/accounting/my-requests" className="text-purple-600 hover:underline mt-4 inline-block">
          Go to My Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Accounting Requests</h1>
          <p className="text-gray-500 mt-1">Manage and process accounting requests</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{total} request{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by request number, name, INN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={18} />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
              )}
            </button>
            <button
              type="button"
              onClick={fetchRequests}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <RefreshCw size={20} />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AccountingRequestStatus | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="needs_info">Needs Info</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as AccountingRequestType | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">All Types</option>
                <option value="reconciliation">Reconciliation</option>
                <option value="payment">Payment</option>
                <option value="confirmation">Confirmation</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as 'normal' | 'urgent' | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">All Priorities</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>

              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value as 'me' | 'unassigned' | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">All Assignments</option>
                <option value="me">Assigned to Me</option>
                <option value="unassigned">Unassigned</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="col-span-2 sm:col-span-4 text-sm text-purple-600 hover:text-purple-700"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No requests found.</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-purple-600 hover:text-purple-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('sla_deadline')}
                    >
                      <div className="flex items-center gap-1">
                        SLA
                        {sortField === 'sla_deadline' && (
                          sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Created
                        {sortField === 'created_at' && (
                          sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map((request) => {
                    const slaStatus = getSlaStatus(request.slaDeadline || null, request.status);
                    return (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <Link
                            href={`/accounting/requests/${request.id}`}
                            className="text-purple-600 hover:text-purple-700 font-medium"
                          >
                            {request.requestNumber}
                          </Link>
                          <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                            {request.title}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getRequestTypeColor(request.requestType)}`}>
                            {getRequestTypeLabel(request.requestType)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                          {request.priority === 'urgent' && (
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor('urgent')}`}>
                              {getPriorityLabel('urgent')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {request.requester?.full_name || 'Unknown'}
                            </span>
                          </div>
                          {request.from_entity && (
                            <div className="flex items-center gap-2 mt-1">
                              <Building2 size={14} className="text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {request.from_entity.name}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {request.amount ? formatCurrency(request.amount) : '-'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className={getSlaColor(slaStatus)} />
                            <span className={`text-sm ${getSlaColor(slaStatus)}`}>
                              {getSlaRemainingText(request.slaDeadline || null)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {formatRelativeTime(request.createdAt)}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {request.assignee ? (
                            <span className="text-gray-900">{request.assignee.full_name}</span>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
