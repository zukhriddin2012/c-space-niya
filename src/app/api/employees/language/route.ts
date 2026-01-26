import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'c-space-hr-secret-key-change-in-production'
);

// Update employee's preferred language
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('c-space-auth')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token and get employee ID
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const employeeId = payload.employeeId as string;

    if (!employeeId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { language } = body;

    // Validate language
    if (!['uz', 'ru', 'en'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Update employee's preferred language
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ preferred_language: language })
      .eq('id', employeeId);

    if (error) {
      console.error('Failed to update language:', error);
      return NextResponse.json({ error: 'Failed to update language' }, { status: 500 });
    }

    return NextResponse.json({ success: true, language });
  } catch (error) {
    console.error('Language update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
