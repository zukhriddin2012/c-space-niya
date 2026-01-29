import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// GET - Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data: doc, error } = await supabaseAdmin!
      .from('candidate_documents')
      .select('*')
      .eq('id', docId)
      .eq('candidate_id', id)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { error } = await supabaseAdmin!
      .from('candidate_documents')
      .delete()
      .eq('id', docId)
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

// PATCH - Perform actions on document (e.g., sign)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'sign':
        return handleSign(id, docId, body);

      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper: Handle recruiter signing
async function handleSign(candidateId: string, docId: string, body: {
  signature_type?: string;
  signature_data?: string;
  signer_name?: string;
  signer_position?: string;
}) {
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
    .eq('candidate_id', candidateId)
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
}
