import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch additional employee data including telegram_id
    let employee = null;
    if (user.employeeId && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('employees')
        .select('id, telegram_id, preferred_language')
        .eq('id', user.employeeId)
        .single();
      employee = data;
    }

    return NextResponse.json({ success: true, user, employee });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
