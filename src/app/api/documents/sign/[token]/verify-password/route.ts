import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get document by token
    const { data: doc, error } = await supabaseAdmin
      .from('candidate_documents')
      .select('id, access_password, signed_at')
      .eq('signing_token', token)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.signed_at) {
      return NextResponse.json({ error: 'Document already signed' }, { status: 400 });
    }

    // Verify password
    if (doc.access_password !== password) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
