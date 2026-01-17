'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Wallet,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

interface Payslip {
  id: string;
  month: number;
  year: number;
  base_salary: number;
  overtime_hours: number;
  overtime_pay: number;
  deductions: number;
  bonuses: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  payment_date: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function getMonthName(month: number, year: number): string {
  return new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700';
    case 'approved':
      return 'bg-blue-100 text-blue-700';
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'paid':
      return <CheckCircle2 size={16} className="text-green-600" />;
    case 'approved':
      return <Clock size={16} className="text-blue-600" />;
    default:
      return <FileText size={16} className="text-gray-400" />;
  }
}

export default function MyPayslipsPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/my-portal/payslips');
      if (res.ok) {
        const data = await res.json();
        setPayslips(data.payslips || []);
      }
    } catch (error) {
      console.error('Error fetching payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = payslips.reduce((sum, p) => sum + p.net_salary, 0);
  const avgSalary = payslips.length > 0 ? totalEarnings / payslips.length : 0;
  const latestPayslip = payslips[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/my-portal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payslips</h1>
          <p className="text-gray-600">View and download your salary statements</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Wallet size={24} />
            <span className="text-purple-200">Latest Salary</span>
          </div>
          <p className="text-3xl font-bold">
            {latestPayslip ? formatCurrency(latestPayslip.net_salary) : '-'}
          </p>
          <p className="text-purple-200 text-sm mt-1">
            {latestPayslip ? getMonthName(latestPayslip.month, latestPayslip.year) : ''}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={24} className="text-green-600" />
            <span className="text-gray-600">YTD Earnings</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEarnings)}</p>
          <p className="text-gray-500 text-sm mt-1">{payslips.length} payslips</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={24} className="text-blue-600" />
            <span className="text-gray-600">Average Salary</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgSalary)}</p>
          <p className="text-gray-500 text-sm mt-1">Per month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payslips List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Payment History</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : payslips.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No payslips available</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payslips.map((payslip) => (
                <button
                  key={payslip.id}
                  onClick={() => setSelectedPayslip(payslip)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedPayslip?.id === payslip.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(payslip.status)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {getMonthName(payslip.month, payslip.year)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payslip.payment_date
                            ? `Paid on ${new Date(payslip.payment_date).toLocaleDateString()}`
                            : payslip.status === 'approved'
                            ? 'Approved - Pending Payment'
                            : 'Processing'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(payslip.net_salary)}
                      </p>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                          payslip.status
                        )}`}
                      >
                        {payslip.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payslip Detail */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Payslip Details</h3>
            {selectedPayslip && (
              <button
                onClick={() => {
                  // In a real app, this would trigger a PDF download
                  alert('PDF download would be triggered here');
                }}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
              >
                <Download size={16} />
                Download
              </button>
            )}
          </div>
          {selectedPayslip ? (
            <div className="p-4 space-y-4">
              <div className="text-center pb-4 border-b border-gray-100">
                <p className="text-lg font-semibold text-gray-900">
                  {getMonthName(selectedPayslip.month, selectedPayslip.year)}
                </p>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                    selectedPayslip.status
                  )}`}
                >
                  {selectedPayslip.status}
                </span>
              </div>

              {/* Earnings */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Earnings</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Salary</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(selectedPayslip.base_salary)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Overtime ({selectedPayslip.overtime_hours}h)
                    </span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(selectedPayslip.overtime_pay)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bonuses</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(selectedPayslip.bonuses)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Deductions</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax & Other</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(selectedPayslip.deductions)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Net Salary</span>
                  <span className="text-xl font-bold text-purple-600">
                    {formatCurrency(selectedPayslip.net_salary)}
                  </span>
                </div>
              </div>

              {selectedPayslip.payment_date && (
                <div className="pt-2 text-center">
                  <p className="text-sm text-gray-500">
                    Paid on {new Date(selectedPayslip.payment_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p>Select a payslip to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
