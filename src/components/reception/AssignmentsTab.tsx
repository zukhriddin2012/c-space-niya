'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Search, Building2, Calendar, UserCog, Send, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/contexts/LanguageContext';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { BulkAssignmentModal } from './BulkAssignmentModal';
import { EndAssignmentDialog } from './EndAssignmentDialog';
import type { BranchAssignment, BranchOption } from '@/modules/reception/types';

type ViewMode = 'by-branch' | 'by-employee';

interface AssignmentsTabProps {
  branchId?: string;
}

export function AssignmentsTab({ branchId }: AssignmentsTabProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('by-branch');
  const [assignments, setAssignments] = useState<BranchAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranchId, setFilterBranchId] = useState(branchId || '');
  const [filterType, setFilterType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [endingAssignment, setEndingAssignment] = useState<BranchAssignment | null>(null);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [sendingTelegramId, setSendingTelegramId] = useState<string | null>(null);
  const [sentTelegramId, setSentTelegramId] = useState<string | null>(null);

  // Fetch branches from API (works outside ServiceHub context)
  useEffect(() => {
    async function fetchBranches() {
      try {
        const response = await fetch('/api/reception/branches');
        if (response.ok) {
          const data = await response.json();
          const branchList = (data.branches || data || []).filter(
            (b: BranchOption) => !b.isAllBranches
          );
          setBranches(branchList);
        }
      } catch {
        console.error('Failed to fetch branches');
      }
    }
    fetchBranches();
  }, []);

  const realBranches = branches;

  const fetchAssignments = useCallback(async () => {
    if (!filterBranchId && viewMode === 'by-branch') return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (viewMode === 'by-branch' && filterBranchId) {
        params.set('branchId', filterBranchId);
      }
      if (filterType) params.set('type', filterType);
      if (searchQuery) params.set('search', searchQuery);
      params.set('includeExpired', 'false');

      const response = await fetch(`/api/reception/admin/branch-assignments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
        setTotal(data.total || 0);
      }
    } catch {
      console.error('Failed to fetch assignments');
    } finally {
      setIsLoading(false);
    }
  }, [filterBranchId, filterType, searchQuery, viewMode]);

  useEffect(() => {
    if (filterBranchId || viewMode === 'by-employee') {
      fetchAssignments();
    }
  }, [fetchAssignments, filterBranchId, viewMode]);

  // Set default filter branch
  useEffect(() => {
    if (!filterBranchId && realBranches.length > 0) {
      setFilterBranchId(realBranches[0].id);
    }
  }, [realBranches, filterBranchId]);

  const handleEndAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/reception/admin/branch-assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setEndingAssignment(null);
        fetchAssignments();
      }
    } catch {
      console.error('Failed to end assignment');
    }
  };

  const handleSendTelegram = async (assignment: BranchAssignment) => {
    setSendingTelegramId(assignment.id);
    try {
      const response = await fetch(
        `/api/reception/admin/branch-assignments/${assignment.id}/notify-telegram`,
        { method: 'POST' }
      );
      if (response.ok) {
        setSentTelegramId(assignment.id);
        setTimeout(() => setSentTelegramId(null), 3000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send Telegram notification');
      }
    } catch {
      alert('Failed to send Telegram notification');
    } finally {
      setSendingTelegramId(null);
    }
  };

  const getDaysLeft = (endsAt?: string): { text: string; isWarning: boolean } | null => {
    if (!endsAt) return null;
    const diff = Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: 'Expired', isWarning: true };
    if (diff === 0) return { text: 'Today', isWarning: true };
    if (diff === 1) return { text: '1 day left', isWarning: true };
    return { text: `${diff} days left`, isWarning: diff <= 7 };
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'temporary':
        return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Temporary</span>;
      case 'regular':
        return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Regular</span>;
      case 'permanent_transfer':
        return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-pink-100 text-pink-800">Transfer</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-purple-600" />
            Branch Assignments
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage employee cross-branch assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowBulkModal(true)}>
            <Users className="w-4 h-4 mr-1" />
            Bulk Assign
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Assignment
          </Button>
        </div>
      </div>

      {/* View Toggle + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('by-branch')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'by-branch' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1" />
            By Branch
          </button>
          <button
            onClick={() => setViewMode('by-employee')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'by-employee' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1" />
            By Employee
          </button>
        </div>

        {viewMode === 'by-branch' && (
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {realBranches.map((b: BranchOption) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Types</option>
          <option value="temporary">Temporary</option>
          <option value="regular">Regular</option>
          <option value="permanent_transfer">Transfer</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Assignments Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No active assignments</p>
          <p className="text-sm text-gray-400 mt-1">
            Assign employees to branches for cross-branch coverage
          </p>
          <Button size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Create First Assignment
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Employee</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Home Branch</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Assigned To</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Period</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Assigned By</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map((assignment) => {
                const daysLeft = getDaysLeft(assignment.endsAt);
                return (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">
                          {assignment.employeeName || assignment.employeeId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {assignment.homeBranchName || assignment.homeBranchId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {assignment.assignedBranchName || assignment.assignedBranchId}
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(assignment.assignmentType)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(assignment.startsAt).toLocaleDateString()}</span>
                        {assignment.endsAt && (
                          <>
                            <span className="text-gray-400"> — </span>
                            <span>{new Date(assignment.endsAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                      {daysLeft && (
                        <span className={`text-xs ${daysLeft.isWarning ? 'text-amber-600' : 'text-gray-400'}`}>
                          {daysLeft.text}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {assignment.assignedByName || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSendTelegram(assignment)}
                          disabled={!assignment.employeeTelegramId || sendingTelegramId === assignment.id}
                          className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
                            !assignment.employeeTelegramId
                              ? 'text-gray-300 cursor-not-allowed'
                              : sentTelegramId === assignment.id
                                ? 'text-green-600'
                                : 'text-blue-600 hover:text-blue-700'
                          }`}
                          title={!assignment.employeeTelegramId ? 'Employee not connected to Telegram' : 'Send assignment details via Telegram'}
                        >
                          {sendingTelegramId === assignment.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : sentTelegramId === assignment.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden lg:inline">
                            {sentTelegramId === assignment.id ? 'Sent' : 'Send'}
                          </span>
                        </button>
                        <button
                          onClick={() => setEndingAssignment(assignment)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          End
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
              {total} assignment{total !== 1 ? 's' : ''} total
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateAssignmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchAssignments}
        branches={realBranches}
      />

      <BulkAssignmentModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onCreated={fetchAssignments}
        branches={realBranches}
      />

      {endingAssignment && (
        <EndAssignmentDialog
          isOpen={!!endingAssignment}
          assignment={endingAssignment}
          onClose={() => setEndingAssignment(null)}
          onConfirm={() => handleEndAssignment(endingAssignment.id)}
        />
      )}
    </div>
  );
}

export default AssignmentsTab;
