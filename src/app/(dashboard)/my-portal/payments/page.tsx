'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Wallet,
  Banknote,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Payment {
  id: string;
  amount: number;
  net_salary: number;
  type: 'advance' | 'wage';
  year: number;
  month: number;
  paid_at?: string;
  payment_reference?: string;
}

interface PendingPayment {
  id: string;
  amount: number;
  net_salary: number;
  type: 'advance' | 'wage';
  year: number;
  month: number;
  status: string;
  submitted_at?: string;
  approved_at?: string;
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

export default function MyPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/my-portal/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setPending(data.pending || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalAdvance = payments
    .filter(p => p.type === 'advance')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalWage = payments
    .filter(p => p.type === 'wage')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = totalAdvance + totalWage;
  const pendingAmount = pending.reduce((sum, p) => sum + p.amount, 0);

  // Group payments by month
  const paymentsByMonth = payments.reduce((acc, p) => {
    const key = `${p.year}-${p.month}`;
    if (!acc[key]) {
      acc[key] = { year: p.year, month: p.month, payments: [] };
    }
    acc[key].payments.push(p);
    return acc;
  }, {} as Record<string, { year: number; month: number; payments: Payment[] }>);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/my-portal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>
          <p className="text-gray-600">View your advance and wage payment history</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 size={24} />
            <span className="text-green-200">Total Received</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Banknote size={24} className="text-orange-600" />
            <span className="text-gray-600">Advance Paid</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalAdvance)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Wallet size={24} className="text-green-600" />
            <span className="text-gray-600">Wage Paid</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalWage)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={24} className="text-blue-600" />
            <span className="text-gray-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(pendingAmount)}</p>
          <p className="text-gray-500 text-sm">{pending.length} requests</p>
        </div>
      </div>

      {/* Pending Payments */}
      {pending.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Clock size={18} />
            Pending Payments
          </h3>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-3">
                  {p.type === 'advance' ? (
                    <Banknote size={18} className="text-orange-500" />
                  ) : (
                    <Wallet size={18} className="text-green-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {p.type === 'advance' ? 'Advance' : 'Wage'} - {getMonthName(p.month, p.year)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {p.status === 'approved' ? 'Approved - Awaiting Payment' : 'Pending Approval'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.status === 'approved' ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Payment History</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No payments received yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.values(paymentsByMonth)
              .sort((a, b) => b.year - a.year || b.month - a.month)
              .map(({ year, month, payments: monthPayments }) => (
                <div key={`${year}-${month}`} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} className="text-gray-400" />
                    <h4 className="font-medium text-gray-700">{getMonthName(month, year)}</h4>
                  </div>
                  <div className="space-y-2 ml-6">
                    {monthPayments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {payment.type === 'advance' ? (
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Banknote size={16} className="text-orange-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Wallet size={16} className="text-green-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {payment.type === 'advance' ? 'Advance Payment' : 'Wage Payment'}
                            </p>
                            {payment.paid_at && (
                              <p className="text-sm text-gray-500">
                                Paid on {new Date(payment.paid_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            payment.type === 'advance' ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(payment.amount)}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 size={12} />
                            Paid
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
