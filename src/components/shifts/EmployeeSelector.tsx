'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, Star, Loader2, AlertCircle, Building2 } from 'lucide-react';

interface AvailableEmployee {
  id: string;
  full_name: string;
  position: string;
  is_floater: boolean;
  primary_branch_id: string | null;
}

interface EmployeeSelectorProps {
  date: string;
  shiftType: 'day' | 'night';
  branchId: string;
  onSelect: (employee: AvailableEmployee) => void;
  selectedId?: string;
}

export default function EmployeeSelector({
  date,
  shiftType,
  branchId,
  onSelect,
  selectedId,
}: EmployeeSelectorProps) {
  const [employees, setEmployees] = useState<AvailableEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          date,
          shift_type: shiftType,
          branch_id: branchId,
        });
        const res = await fetch(`/api/shifts/available-employees?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch');
        }
        const data = await res.json();
        setEmployees(data.employees || []);
      } catch (err) {
        console.error('Error fetching available employees:', err);
        setError(err instanceof Error ? err.message : 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [date, shiftType, branchId]);

  // Filter and sort: branch employees first, then others
  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter((emp) =>
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort: branch employees first, then floaters, then others
    return filtered.sort((a, b) => {
      const aIsBranch = a.primary_branch_id === branchId;
      const bIsBranch = b.primary_branch_id === branchId;

      if (aIsBranch && !bIsBranch) return -1;
      if (!aIsBranch && bIsBranch) return 1;

      // If both are branch or both aren't, sort floaters next
      if (a.is_floater && !b.is_floater) return -1;
      if (!a.is_floater && b.is_floater) return 1;

      // Finally sort by name
      return a.full_name.localeCompare(b.full_name);
    });
  }, [employees, searchQuery, branchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-500">Loading available employees...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-red-600">
        <AlertCircle className="h-5 w-5 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Employee List */}
      <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
        {filteredEmployees.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchQuery ? 'No employees match your search' : 'No available employees for this shift'}
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => onSelect(employee)}
              className={`w-full flex items-center gap-3 p-3 text-left hover:bg-purple-50 transition-colors ${
                selectedId === employee.id ? 'bg-purple-50 border-l-4 border-purple-600' : ''
              }`}
            >
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {employee.full_name}
                  </span>
                  {employee.primary_branch_id === branchId && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700" title="This branch">
                      <Building2 className="h-3 w-3 mr-0.5" />
                      Branch
                    </span>
                  )}
                  {employee.is_floater && (
                    <span title="Floater" className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                      <Star className="h-3 w-3 mr-0.5" />
                      Floater
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{employee.position}</p>
              </div>
              {selectedId === employee.id && (
                <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-500">
        {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} available
        {employees.some(e => e.is_floater) && (
          <span className="ml-2">
            <Star className="inline h-3 w-3 text-amber-500" /> = Floater
          </span>
        )}
      </p>
    </div>
  );
}
