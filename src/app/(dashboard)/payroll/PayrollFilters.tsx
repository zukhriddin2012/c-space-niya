'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Search } from 'lucide-react';

interface PayrollFiltersProps {
  currentYear: number;
  currentMonth: number;
  currentStatus: string;
}

export default function PayrollFilters({
  currentYear,
  currentMonth,
  currentStatus,
}: PayrollFiltersProps) {
  const router = useRouter();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [status, setStatus] = useState(currentStatus);

  // Generate month options for last 12 months
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
    }

    return options;
  };

  const monthOptions = getMonthOptions();

  const handleMonthChange = (value: string) => {
    const [y, m] = value.split('-').map(Number);
    setYear(y);
    setMonth(m);
  };

  const handleApply = () => {
    const params = new URLSearchParams();
    params.set('year', String(year));
    params.set('month', String(month));
    if (status) params.set('status', status);

    router.push(`/payroll?${params.toString()}`);
  };

  const handleReset = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setStatus('');
    router.push('/payroll');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg">
            <Calendar size={18} className="text-gray-400" />
            <select
              value={`${year}-${month}`}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="outline-none text-sm bg-transparent min-w-[150px]"
            >
              {monthOptions.map((opt) => (
                <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <Search size={16} />
            Apply
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
