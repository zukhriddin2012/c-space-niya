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

// POST - Create a new Term Sheet document for a candidate
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
      // Basic info
      document_type = 'Условия трудоустройства',
      candidate_name,
      position,
      branch_id,
      branch_name,
      branch_address,
      reporting_to,

      // Selection results
      screening_passed = true,
      interview1_passed = true,
      interview2_passed = false,

      // Employment terms (full contract)
      contract_type,
      contract_duration,
      start_date,
      salary,
      salary_review,

      // Probation-specific fields
      probation_duration,
      probation_start_date,
      probation_end_date,
      working_hours,
      probation_salary,

      // Probation metrics
      probation_metrics = [],

      // Final interview
      final_interview_date,
      final_interview_time,
      final_interview_interviewer,
      final_interview_purpose,

      // Onboarding
      onboarding_weeks = [],

      // Contacts
      contacts = [],

      // Escalation
      escalation_contact,
      escalation_contact_position,

      // Representative
      representative_name,
      representative_position,

      // Password
      password,
    } = body;

    // Password is required
    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    // Get candidate info if candidate_name not provided
    let finalCandidateName = candidate_name;
    let finalPosition = position;

    if (!finalCandidateName || !finalPosition) {
      const { data: candidate, error: candidateError } = await supabaseAdmin!
        .from('candidates')
        .select('full_name, applied_role')
        .eq('id', id)
        .single();

      if (candidateError || !candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }

      finalCandidateName = finalCandidateName || candidate.full_name;
      finalPosition = finalPosition || candidate.applied_role;
    }

    // Generate unique signing token
    const signingToken = randomBytes(32).toString('hex');

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin!
      .from('candidate_documents')
      .insert({
        candidate_id: id,
        document_type,
        candidate_name: finalCandidateName,
        position: finalPosition,
        branch_id: branch_id || null,
        branch_name,
        branch_address,
        reporting_to,

        screening_passed,
        interview1_passed,
        interview2_passed,

        contract_type,
        contract_duration,
        start_date: start_date || null,
        salary,
        salary_review,

        // Probation-specific fields
        probation_duration,
        probation_start_date: probation_start_date || null,
        probation_end_date: probation_end_date || null,
        working_hours,
        probation_salary,

        probation_metrics,

        final_interview_date: final_interview_date || null,
        final_interview_time,
        final_interview_interviewer,
        final_interview_purpose,

        onboarding_weeks,
        contacts,

        escalation_contact,
        escalation_contact_position,

        representative_name,
        representative_position,

        signing_token: signingToken,
        access_password: password,
        status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      return NextResponse.json({ error: 'Failed to create document: ' + docError.message }, { status: 500 });
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
      password: password,
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

    // Delete the document (only if it belongs to this candidate)
    const { error } = await supabaseAdmin!
      .from('candidate_documents')
      .delete()
      .eq('id', documentId)
      .eq('candidate_id', id);

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
