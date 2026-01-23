import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import { randomBytes } from 'crypto';

// GET - List documents for a candidate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data: documents, error } = await supabaseAdmin!
      .from('candidate_documents')
      .select('*')
      .eq('candidate_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create a new document (Term Sheet) for a candidate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      document_type = 'Условия трудоустройства',
      branch,
      salary,
      work_hours = '9:00 - 18:00',
      start_date,
      end_date,
      password,
    } = body;

    // Password is required
    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    // Get candidate info
    const { data: candidate, error: candidateError } = await supabaseAdmin!
      .from('candidates')
      .select('id, full_name, email, applied_role, probation_start_date, probation_end_date')
      .eq('id', id)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Generate unique signing token
    const signingToken = randomBytes(32).toString('hex');

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin!
      .from('candidate_documents')
      .insert({
        candidate_id: id,
        document_type,
        branch: branch || 'C-Space Yunusabad',
        salary: salary || '2 000 000 сум',
        work_hours,
        start_date: start_date || candidate.probation_start_date,
        end_date: end_date || candidate.probation_end_date,
        signing_token: signingToken,
        access_password: password,
        status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    // Generate the signing URL
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const signingUrl = `${baseUrl}/sign/${signingToken}`;

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        signing_url: signingUrl,
      },
      signing_url: signingUrl,
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Delete the document (only if it belongs to this candidate and is not signed)
    const { error } = await supabaseAdmin!
      .from('candidate_documents')
      .delete()
      .eq('id', documentId)
      .eq('candidate_id', id)
      .is('signed_at', null);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
