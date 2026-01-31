import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// GET /api/reception/clients/search
// Search clients by name with optional branch filter
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const branchId = searchParams.get('branchId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query.length < 2) {
      return NextResponse.json({ clients: [] });
    }

    // Search clients by name
    let dbQuery = supabaseAdmin!
      .from('clients')
      .select('id, name, client_type, phone, company_name, industry')
      .ilike('name', `%${query}%`)
      .eq('is_active', true)
      .order('name')
      .limit(limit);

    // Optionally filter by branch
    if (branchId && branchId !== 'all') {
      dbQuery = dbQuery.eq('branch_id', branchId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Client search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const clients = (data || []).map(client => ({
      id: client.id,
      name: client.name,
      type: client.client_type as 'company' | 'individual',
      phone: client.phone,
      companyName: client.company_name,
      industry: client.industry,
    }));

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
