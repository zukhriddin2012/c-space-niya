import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// POST - Recruiter signs the document (approves it)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      signature_type, // 'draw' or 'type'
      signature_data, // Base64 image or JSON with name/style
      signer_name,
      signer_position,
    } = body;

    if (!signature_type || !signature_data) {
      return NextResponse.json({ error: 'Signature data required' }, { status: 400 });
    }

    if (!signer_name) {
      return NextResponse.json({ error: 'Signer name required' }, { status: 400 });
    }

    // Verify document exists and belongs to this candidate
    const { data: doc, error: fetchError } = await supabaseAdmin!
      .from('candidate_documents')
      .select('id, status, recruiter_signed_at')
      .eq('id', docId)
      .eq('candidate_id', id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if already signed by recruiter
    if (doc.recruiter_signed_at) {
      return NextResponse.json({ error: 'Document already signed by recruiter' }, { status: 400 });
    }

    // Update document with recruiter signature
    const { error: updateError } = await supabaseAdmin!
      .from('candidate_documents')
      .update({
        recruiter_signature_type: signature_type,
        recruiter_signature_data: signature_data,
        recruiter_signed_at: new Date().toISOString(),
        recruiter_signed_by: signer_name,
        recruiter_signed_by_position: signer_position || null,
        status: 'approved', // Now ready for candidate to sign
        // Also update representative fields if provided
        representative_name: signer_name,
        representative_position: signer_position || null,
      })
      .eq('id', docId);

    if (updateError) {
      console.error('Error signing document:', updateError);
      return NextResponse.json({ error: 'Failed to sign document' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document signed and approved. Ready to share with candidate.',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
