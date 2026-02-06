'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { LegalRequest, LegalRequestStatus, LegalRequestType } from '@/modules/legal/types';
import { LEGAL_REQUEST_TYPE_LABELS, LEGAL_STATUS_LABELS, LEGAL_STATUS_TRANSITIONS } from '@/modules/legal/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Scale, Search, Filter, ChevronLeft, ChevronRight, UserPlus, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';

interface RequestWithRelations extends LegalRequest {
  submittedByName?: string;
  assignedToName?: string;
  branchName?: string;
}

interface ApiResponse {
  data: RequestWithRelations[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  stats: {
    total: number;
    byStatus: Record<LegalRequestStatus, number>;
    byType: Record<LegalRequestType, number>;
  };
}

interface AssignState {
  [requestId: string]: boolean;
}

interface StatusChangeState {
  [requestId: string]: boolean;
}

// Status color mapping
const statusColorMap: Record<LegalRequestStatus, 'info' | 'warning' | 'purple' | 'success' | 'default' | 'danger'> = {
  submitted: 'info',
  under_review: 'warning',
  in_progress: 'purple',
  ready: 'success',
  completed: 'default',
  rejected: 'danger',
};

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function LegalRequestsPage() {
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LegalRequestStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<LegalRequestType | ''>('');
  const [assignedFilter, setAssignedFilter] = useState<'me' | 'unassigned' | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Stats
  const [stats, setStats] = useState<ApiResponse['stats'] | null>(null);

  // Action states
  const [assigningTo, setAssigningTo] = useState<AssignState>({});
  const [changingStatus, setChangingStatus] = useState<StatusChangeState>({});

  const totalPages = Math.ceil(total / pageSize);
  const hasActiveFilters = statusFilter || typeFilter || assignedFilter || searchQuery;

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('requestType', typeFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (assignedFilter === 'me') params.append('assignedTo', 'current_user');
      if (assignedFilter === 'unassigned') params.append('assignedTo', 'unassigned');

      const response = await fetch(`/api/legal/requests?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch legal requests');
      }

      const data: ApiResponse = await response.json();
      setRequests(data.data);
      setTotal(data.pagination.total);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching requests');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter, searchQuery, assignedFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  // Clear filters
  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setAssignedFilter('');
    setSearchQuery('');
    setPage(1);
  };

  // Assign request
  const handleAssign = async (requestId: string, assignToId: string) => {
    try {
      setAssigningTo(prev => ({ ...prev, [requestId]: true }));

      const response = await fetch(`/api/legal/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: assignToId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign request');
      }

      // Refresh the requests
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign request');
    } finally {
      setAssigningTo(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Change status
  const handleStatusChange = async (requestId: string, newStatus: LegalRequestStatus) => {
    try {
      setChangingStatus(prev => ({ ...prev, [requestId]: true }));

      const response = await fetch(`/api/legal/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Refresh the requests
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setChangingStatus(prev => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Scale className="text-purple-600" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Legal Requests</h1>
          </div>
          <p className="text-gray-500 ml-11">Manage all legal requests across branches</p>
        </div>
        <div className="text-sm text-gray-500">
          Total: <span className="font-semibold text-gray-900">{total}</span>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="!p-3 lg:!p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.byStatus.submitted}</div>
              <div className="text-xs text-gray-500 mt-1">Submitted</div>
            </div>
          </Card>
          <Card className="!p-3 lg:!p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.byStatus.under_review}</div>
              <div className="text-xs text-gray-500 mt-1">Under Review</div>
            </div>
          </Card>
          <Card className="!p-3 lg:!p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.byStatus.in_progress}</div>
              <div className="text-xs text-gray-500 mt-1">In Progress</div>
            </div>
          </Card>
          <Card className="!p-3 lg:!p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.byStatus.ready}</div>
              <div className="text-xs text-gray-500 mt-1">Ready</div>
            </div>
          </Card>
          <Card className="!p-3 lg:!p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.byStatus.completed}</div>
              <div className="text-xs text-gray-500 mt-1">Completed</div>
            </div>
          </Card>
          <Card className="!p-3 lg:!p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.byStatus.rejected}</div>
              <div className="text-xs text-gray-500 mt-1">Rejected</div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="!p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by request number, branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${
                showFilters || hasActiveFilters
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={16} />
              Filters
              {hasActiveFilters && <span className="w-2 h-2 bg-purple-600 rounded-full" />}
            </button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={fetchRequests}
              className="px-3"
            >
              Refresh
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-gray-200">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as LegalRequestStatus | '');
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="in_progress">In Progress</option>
                <option value="ready">Ready</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as LegalRequestType | '');
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">All Types</option>
                <option value="contract_preparation">Contract Preparation</option>
                <option value="supplementary_agreement">Supplementary Agreement</option>
                <option value="contract_termination">Contract Termination</option>
                <option value="website_registration">Website Registration</option>
                <option value="guarantee_letter">Guarantee Letter</option>
              </select>

              <select
                value={assignedFilter}
                onChange={(e) => {
                  setAssignedFilter(e.target.value as 'me' | 'unassigned' | '');
                  setPage(1);
                }}
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
                  className="col-span-full text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </form>
      </Card>

      {/* Requests Table */}
      <Card className="!p-0">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-purple-600" size={32} />
              <p className="text-gray-500 text-sm">Loading requests...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
              <AlertTriangle size={20} />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-gray-600">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchRequests}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <Scale className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-600 font-medium">No legal requests found</p>
            <p className="text-gray-500 text-sm mt-1">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Legal requests will appear here'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Request
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Submitted By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map((request) => {
                    const possibleNextStatuses = LEGAL_STATUS_TRANSITIONS[request.status];

                    return (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <Link
                            href={`/legal/requests/${request.id}`}
                            className="text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1 group"
                          >
                            {request.requestNumber}
                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="info" size="sm">
                            {LEGAL_REQUEST_TYPE_LABELS[request.requestType]}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {request.branchName || request.branchId}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {request.submittedByName || 'Unknown'}
                        </td>
                        <td className="px-4 py-4">
                          {possibleNextStatuses.length > 0 ? (
                            <div className="relative group">
                              <button
                                className="cursor-pointer"
                                disabled={changingStatus[request.id]}
                              >
                                <Badge
                                  variant={statusColorMap[request.status]}
                                  size="sm"
                                >
                                  {LEGAL_STATUS_LABELS[request.status]}
                                </Badge>
                              </button>
                              {changingStatus[request.id] ? (
                                <div className="absolute left-0 top-full mt-1 z-10">
                                  <Loader2 className="animate-spin text-purple-600" size={14} />
                                </div>
                              ) : (
                                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-max">
                                  {possibleNextStatuses.map((nextStatus) => (
                                    <button
                                      key={nextStatus}
                                      onClick={() => handleStatusChange(request.id, nextStatus)}
                                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 first:rounded-t-lg last:rounded-b-lg"
                                    >
                                      {LEGAL_STATUS_LABELS[nextStatus]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge
                              variant={statusColorMap[request.status]}
                              size="sm"
                            >
                              {LEGAL_STATUS_LABELS[request.status]}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {request.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                                <span className="text-xs font-semibold text-purple-600">
                                  {request.assignedToName?.charAt(0) || 'A'}
                                </span>
                              </div>
                              <span className="text-sm text-gray-700">{request.assignedToName || 'Assigned'}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAssign(request.id, 'current_user')}
                              disabled={assigningTo[request.id]}
                              className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50"
                            >
                              {assigningTo[request.id] ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <UserPlus size={14} />
                              )}
                              Assign
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {formatRelativeTime(request.createdAt)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Link
                            href={`/legal/requests/${request.id}`}
                            className="inline-flex items-center justify-center w-8 h-8 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <ArrowRight size={16} />
                          </Link>
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
                <div className="text-sm text-gray-600">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} requests
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      if (totalPages > 5 && i === 4) {
                        return (
                          <span key="dots" className="text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
                            page === pageNum
                              ? 'bg-purple-600 text-white font-medium'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
