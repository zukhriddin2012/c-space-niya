import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// GET - Fetch document info by signing token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // First try to get from candidate_documents table
    const { data: doc, error } = await supabaseAdmin!
      .from('candidate_documents')
      .select(`
        *,
        candidate:candidates(
          id,
          full_name,
          email,
          applied_role,
          probation_start_date,
          probation_end_date
        )
      `)
      .eq('signing_token', token)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found or link expired' }, { status: 404 });
    }

    // Check if document has been approved by recruiter (status should be 'approved' or already 'signed')
    if (doc.status === 'draft' || !doc.recruiter_signed_at) {
      return NextResponse.json({
        error: 'Документ ещё не утверждён. Пожалуйста, дождитесь утверждения от представителя компании.',
        status: 'not_approved'
      }, { status: 403 });
    }

    // Format the response - return all document fields
    const document = {
      id: doc.id,
      candidate_id: doc.candidate_id,
      document_type: doc.document_type || 'Условия трудоустройства',

      // Candidate info
      candidate_name: doc.candidate_name || doc.candidate?.full_name || 'Unknown',
      position: doc.position || doc.candidate?.applied_role || 'Community Manager',
      branch_name: doc.branch_name || '',
      branch_address: doc.branch_address || '',
      reporting_to: doc.reporting_to || '',

      // Selection results
      screening_passed: doc.screening_passed ?? true,
      interview1_passed: doc.interview1_passed ?? true,
      interview2_passed: doc.interview2_passed ?? false,

      // Employment terms (full contract)
      contract_type: doc.contract_type || '',
      contract_duration: doc.contract_duration || '',
      start_date: doc.start_date || '',
      salary: doc.salary || '',
      salary_review: doc.salary_review || '',

      // Probation-specific fields
      probation_duration: doc.probation_duration || '',
      probation_start_date: doc.probation_start_date || '',
      probation_end_date: doc.probation_end_date || '',
      working_hours: doc.working_hours || '',
      probation_salary: doc.probation_salary || '',

      // Probation metrics
      probation_metrics: doc.probation_metrics || [],

      // Final interview
      final_interview_date: doc.final_interview_date || '',
      final_interview_time: doc.final_interview_time || '',
      final_interview_interviewer: doc.final_interview_interviewer || '',
      final_interview_purpose: doc.final_interview_purpose || '',

      // Onboarding
      onboarding_weeks: doc.onboarding_weeks || [],

      // Contacts
      contacts: doc.contacts || [],

      // Escalation
      escalation_contact: doc.escalation_contact || '',
      escalation_contact_position: doc.escalation_contact_position || '',

      // Representative
      representative_name: doc.representative_name || '',
      representative_position: doc.representative_position || '',

      // Recruiter signature
      recruiter_signed_at: doc.recruiter_signed_at,
      recruiter_signed_by: doc.recruiter_signed_by,
      recruiter_signed_by_position: doc.recruiter_signed_by_position,
      recruiter_signature_data: doc.recruiter_signature_data,
      recruiter_signature_type: doc.recruiter_signature_type,

      // Signing status
      created_at: doc.created_at,
      signed_at: doc.signed_at,
      signature_data: doc.signature_data,
    };

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}
