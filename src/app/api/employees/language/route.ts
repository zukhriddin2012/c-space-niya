import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'c-space-hr-secret-key-change-in-production'
);

// Update employee's preferred language
// Supports two modes:
// 1. Web app: Uses JWT token to identify user
// 2. Bot: Uses telegramId in body to identify user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { language, telegramId } = body;

    // Validate language
    if (!['uz', 'ru', 'en'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Mode 1: Bot update via telegramId
    if (telegramId) {
      const { error } = await supabaseAdmin
        .from('employees')
        .update({ preferred_language: language })
        .eq('telegram_id', telegramId);

      if (error) {
        console.error('Failed to update language via telegramId:', error);
        return NextResponse.json({ error: 'Failed to update language' }, { status: 500 });
      }

      return NextResponse.json({ success: true, language });
    }

    // Mode 2: Web app update via JWT token
    const cookieStore = await cookies();
    const token = cookieStore.get('c-space-auth')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token and get employee ID
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // payload.sub or payload.id contains the employee UUID
    const id = (payload.sub || payload.id) as string;

    if (!id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Update employee's preferred language by UUID
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ preferred_language: language })
      .eq('id', id);

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

// GET endpoint to fetch language by telegramId (for bot)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('preferred_language')
      .eq('telegram_id', telegramId)
      .single();

    if (error || !data) {
      return NextResponse.json({ language: 'uz' }); // Default to Uzbek
    }

    return NextResponse.json({ language: data.preferred_language || 'uz' });
  } catch (error) {
    console.error('Language fetch error:', error);
    return NextResponse.json({ language: 'uz' });
  }
}
