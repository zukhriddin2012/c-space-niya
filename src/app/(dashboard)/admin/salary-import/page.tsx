'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download, Plus, Trash2, Save } from 'lucide-react';

interface SalaryRecord {
  id: string;
  employee_name: string;
  employee_id?: string;
  year: number;
  month: number;
  advance: number;
  salary: number;
  total: number;
  branch?: string;
  notes?: string;
  matched?: boolean;
}

const MONTHS = [
  { value: 1, label: 'January', labelUz: 'Yanvar' },
  { value: 2, label: 'February', labelUz: 'Fevral' },
  { value: 3, label: 'March', labelUz: 'Mart' },
  { value: 4, label: 'April', labelUz: 'Aprel' },
  { value: 5, label: 'May', labelUz: 'May' },
  { value: 6, label: 'June', labelUz: 'Iyun' },
  { value: 7, label: 'July', labelUz: 'Iyul' },
  { value: 8, label: 'August', labelUz: 'Avgust' },
  { value: 9, label: 'September', labelUz: 'Sentyabr' },
  { value: 10, label: 'October', labelUz: 'Oktabr' },
  { value: 11, label: 'November', labelUz: 'Noyabr' },
  { value: 12, label: 'December', labelUz: 'Dekabr' },
];

const YEARS = [2024, 2025, 2026];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function parseAmount(value: string): number {
  if (!value || value === '-' || value === '0') return 0;
  // Remove spaces, dots as thousand separators, and handle various formats
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/[^\d]/g, '');
  return parseInt(cleaned) || 0;
}

function formatCurrency(amount: number): string {
  if (!amount) return '-';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

export default function SalaryImportPage() {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string; employee_id: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(1);

  // Fetch employees for matching
  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  // Match employee name to employee record
  const matchEmployee = (name: string): { id: string; employee_id: string } | null => {
    if (!name) return null;
    const normalizedName = name.toLowerCase().trim();

    // Try exact match first
    let match = employees.find(e =>
      e.full_name.toLowerCase() === normalizedName
    );

    // Try partial match
    if (!match) {
      match = employees.find(e =>
        e.full_name.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(e.full_name.toLowerCase())
      );
    }

    // Try matching by first name
    if (!match) {
      const firstName = normalizedName.split(' ')[0];
      match = employees.find(e =>
        e.full_name.toLowerCase().startsWith(firstName)
      );
    }

    return match ? { id: match.id, employee_id: match.employee_id } : null;
  };

  // Add single record manually
  const addRecord = () => {
    const newRecord: SalaryRecord = {
      id: generateId(),
      employee_name: '',
      year: selectedYear,
      month: selectedMonth,
      advance: 0,
      salary: 0,
      total: 0,
      matched: false,
    };
    setRecords([...records, newRecord]);
  };

  // Update record
  const updateRecord = (id: string, field: keyof SalaryRecord, value: any) => {
    setRecords(records.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };

        // Auto-calculate total
        if (field === 'advance' || field === 'salary') {
          updated.total = (updated.advance || 0) + (updated.salary || 0);
        }

        // Auto-match employee
        if (field === 'employee_name' && value) {
          const match = matchEmployee(value);
          if (match) {
            updated.employee_id = match.employee_id;
            updated.matched = true;
          } else {
            updated.employee_id = undefined;
            updated.matched = false;
          }
        }

        return updated;
      }
      return r;
    }));
  };

  // Remove record
  const removeRecord = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
  };

  // Parse CSV file
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch employees first for matching
      await fetchEmployees();

      const text = await file.text();
      const lines = text.split('\n');
      const newRecords: SalaryRecord[] = [];

      let currentBranch = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split(',');

        // Skip empty lines
        if (!cols[1] || cols[1].trim() === '' || cols[1].trim() === 'Ism') continue;

        // Check if this is a branch header
        if (cols[0] && cols[0].trim() !== '') {
          currentBranch = cols[0].trim();
          continue;
        }

        const employeeName = cols[1]?.trim();
        if (!employeeName) continue;

        // Skip header rows and special entries
        if (employeeName === 'Ism' || employeeName.includes("bo'lim")) continue;

        // Match employee
        const match = matchEmployee(employeeName);

        // Create record for the selected month/year
        // The CSV has columns: Avans, Oylik pairs for each month
        // We'll let user select which month to import

        const record: SalaryRecord = {
          id: generateId(),
          employee_name: employeeName,
          employee_id: match?.employee_id,
          year: selectedYear,
          month: selectedMonth,
          advance: 0,
          salary: 0,
          total: 0,
          branch: currentBranch,
          matched: !!match,
        };

        newRecords.push(record);
      }

      setRecords(newRecords);
      setSuccess(`Parsed ${newRecords.length} employee records. Please enter salary data for ${MONTHS[selectedMonth - 1].label} ${selectedYear}.`);
    } catch (err) {
      setError('Failed to parse CSV file. Please check the format.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Import records to database
  const handleImport = async () => {
    const validRecords = records.filter(r => r.matched && (r.advance > 0 || r.salary > 0));

    if (validRecords.length === 0) {
      setError('No valid records to import. Make sure employees are matched and have salary data.');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/import-salary-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: validRecords }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import salary history');
      }

      const data = await response.json();
      setSuccess(`Successfully imported ${data.imported} salary records!`);
      setRecords([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import salary history');
    } finally {
      setImporting(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const headers = ['Employee Name', 'Employee ID', 'Year', 'Month', 'Advance (UZS)', 'Salary (UZS)', 'Branch', 'Notes'];
    const sampleData = [
      ['Zuxriddin Abduraxmonov', 'CS-001', '2025', '1', '1500000', '3500000', 'Labzak', ''],
      ['Ruxshona Nabijonova', 'CS-002', '2025', '1', '1000000', '2500000', 'HQ', ''],
    ];

    const csv = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const matchedCount = records.filter(r => r.matched).length;
  const unmatchedCount = records.filter(r => !r.matched).length;
  const totalAdvance = records.reduce((sum, r) => sum + (r.advance || 0), 0);
  const totalSalary = records.reduce((sum, r) => sum + (r.salary || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Import Historical Salary Data</h1>
        <p className="text-gray-500 mt-1">Upload salary history or add records manually</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Year/Month Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Period:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          {/* Action Buttons */}
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download size={16} />
            Download Template
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
            <Upload size={16} />
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={loading}
            />
          </label>

          <button
            onClick={() => { fetchEmployees(); addRecord(); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Plus size={16} />
            Add Record
          </button>
        </div>
      </div>

      {/* Stats */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="text-xl font-semibold text-gray-900">{records.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Matched</p>
            <p className="text-xl font-semibold text-green-600">{matchedCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Unmatched</p>
            <p className="text-xl font-semibold text-red-600">{unmatchedCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Advance</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalAdvance)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Salary</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalSalary)}</p>
          </div>
        </div>
      )}

      {/* Records Table */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Advance</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Salary</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id} className={record.matched ? '' : 'bg-red-50'}>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={record.employee_name}
                        onChange={(e) => updateRecord(record.id, 'employee_name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        placeholder="Employee name"
                      />
                      {record.employee_id && (
                        <p className="text-xs text-gray-500 mt-1">{record.employee_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={record.branch || ''}
                        onChange={(e) => updateRecord(record.id, 'branch', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        placeholder="Branch"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {MONTHS[record.month - 1]?.label} {record.year}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={record.advance || ''}
                        onChange={(e) => updateRecord(record.id, 'advance', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={record.salary || ''}
                        onChange={(e) => updateRecord(record.id, 'salary', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(record.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.matched ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          <CheckCircle size={12} />
                          Matched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                          <AlertCircle size={12} />
                          Not Found
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeRecord(record.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {records.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileSpreadsheet size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Yet</h3>
          <p className="text-gray-500 mb-4">
            Upload a CSV file with salary data or add records manually
          </p>
          <div className="flex justify-center gap-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
              <Upload size={16} />
              Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={() => { fetchEmployees(); addRecord(); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Plus size={16} />
              Add Manually
            </button>
          </div>
        </div>
      )}

      {/* Import Button */}
      {records.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={importing || matchedCount === 0}
            className="inline-flex items-center gap-2 px-6 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Save size={20} />
                Import {matchedCount} Records
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
