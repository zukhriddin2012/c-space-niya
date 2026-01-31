import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

interface CreateClientInput {
  name: string;
  type: 'company' | 'individual';
  phone?: string;
  companyName?: string;
  industry?: string;
  branchId: string;
}

// POST /api/reception/clients
// Create a new client (quick creation from autocomplete)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body: CreateClientInput = await request.json();

    // Validate required fields
    const errors: string[] = [];
    if (!body.name?.trim()) errors.push('Name is required');
    if (!body.type) errors.push('Type is required');
    if (!body.branchId) errors.push('Branch is required');

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Normalize name for uniqueness check
    const normalizedName = body.name.trim().toLowerCase().replace(/\s+/g, ' ');

    // Check for existing client with same name in branch
    const { data: existing } = await supabaseAdmin!
      .from('clients')
      .select('id')
      .eq('name_normalized', normalizedName)
      .eq('branch_id', body.branchId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Client with this name already exists in this branch', existingId: existing.id },
        { status: 409 }
      );
    }

    // Insert new client
    const { data, error } = await supabaseAdmin!
      .from('clients')
      .insert({
        name: body.name.trim(),
        name_normalized: normalizedName,
        client_type: body.type,
        phone: body.phone?.trim() || null,
        company_name: body.companyName?.trim() || null,
        industry: body.industry || null,
        branch_id: body.branchId,
        is_active: true,
      })
      .select('id, name, client_type, phone, company_name, industry')
      .single();

    if (error) {
      console.error('Client creation error:', error);
      return NextResponse.json({ error: 'Failed to create client', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      type: data.client_type,
      phone: data.phone,
      companyName: data.company_name,
      industry: data.industry,
    }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
