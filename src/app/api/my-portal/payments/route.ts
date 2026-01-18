import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getEmployeePaymentHistory } from '@/lib/db';

// GET /api/my-portal/payments - Get employee's payment history
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !user.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payments, pending } = await getEmployeePaymentHistory(user.employeeId);

    return NextResponse.json({
      payments,
      pending,
    });
  } catch (error) {
    console.error('Error fetching employee payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
