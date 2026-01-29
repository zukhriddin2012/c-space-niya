import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ============================================
// LEGAL ENTITIES
// ============================================

export interface LegalEntity {
  id: string;
  name: string;
  short_name: string | null;
  inn: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  mfo: string | null;
  oked: string | null;
  nds_code: string | null;
  director_name: string | null;
  director_employee_id: string | null;
  branch_id: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  branches?: { name: string };
}

export async function getLegalEntities(): Promise<LegalEntity[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('legal_entities')
    .select('*, branches!employees_branch_id_fkey(name)')
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching legal entities:', error);
    return [];
  }

  return data || [];
}

export async function getLegalEntityById(id: string): Promise<LegalEntity | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('legal_entities')
    .select('*, branches!employees_branch_id_fkey(name)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching legal entity:', error);
    return null;
  }

  return data;
}

export async function createLegalEntity(entity: {
  name: string;
  short_name?: string;
  inn?: string;
  address?: string;
  bank_name?: string;
  bank_account?: string;
  mfo?: string;
  oked?: string;
  nds_code?: string;
  director_name?: string;
  branch_id?: string;
}): Promise<{ success: boolean; entity?: LegalEntity; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Generate ID from name
  const id = entity.name
    .toLowerCase()
    .replace(/[«»""'']/g, '')
    .replace(/ооо|сп\s*/gi, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    || `entity-${Date.now()}`;

  const { data, error } = await supabaseAdmin!
    .from('legal_entities')
    .insert({
      id,
      name: entity.name,
      short_name: entity.short_name || null,
      inn: entity.inn || null,
      address: entity.address || null,
      bank_name: entity.bank_name || null,
      bank_account: entity.bank_account || null,
      mfo: entity.mfo || null,
      oked: entity.oked || null,
      nds_code: entity.nds_code || null,
      director_name: entity.director_name || null,
      branch_id: entity.branch_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating legal entity:', error);
    return { success: false, error: error.message };
  }

  return { success: true, entity: data };
}

export async function updateLegalEntity(
  id: string,
  updates: Partial<LegalEntity>
): Promise<{ success: boolean; entity?: LegalEntity; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('legal_entities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating legal entity:', error);
    return { success: false, error: error.message };
  }

  return { success: true, entity: data };
}
