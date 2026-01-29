// Position database functions
import { supabaseAdmin, isSupabaseAdminConfigured, Position } from './connection';

export async function getPositions(): Promise<Position[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('positions')
    .select(`
      *,
      department:departments(id, name, color)
    `)
    .order('level')
    .order('name');

  if (error) {
    console.error('Error fetching positions:', error);
    return [];
  }

  return data || [];
}

export async function getActivePositions(): Promise<Position[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('positions')
    .select(`
      *,
      department:departments(id, name, color)
    `)
    .eq('is_active', true)
    .order('level')
    .order('name');

  if (error) {
    console.error('Error fetching active positions:', error);
    return [];
  }

  return data || [];
}

export async function getPositionById(id: string): Promise<Position | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('positions')
    .select(`
      *,
      department:departments(id, name, color)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching position by id:', error);
    return null;
  }

  return data;
}

export async function createPosition(position: {
  name: string;
  name_uz?: string;
  name_ru?: string;
  description?: string;
  department_id?: string | null;
  level?: string;
  min_salary?: number;
  max_salary?: number;
  is_active?: boolean;
}): Promise<Position | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('positions')
    .insert({
      name: position.name,
      name_uz: position.name_uz || null,
      name_ru: position.name_ru || null,
      description: position.description || null,
      department_id: position.department_id || null,
      level: position.level || null,
      min_salary: position.min_salary || null,
      max_salary: position.max_salary || null,
      is_active: position.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating position:', error);
    return null;
  }

  return data;
}

export async function updatePosition(
  id: string,
  updates: Record<string, unknown>
): Promise<Position | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('positions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating position:', error);
    return null;
  }

  return data;
}

export async function deletePosition(id: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return false;
  }

  const { error } = await supabaseAdmin!
    .from('positions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting position:', error);
    return false;
  }

  return true;
}

export async function getPositionsByDepartment(departmentId: string): Promise<Position[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('positions')
    .select('*')
    .eq('department_id', departmentId)
    .eq('is_active', true)
    .order('level')
    .order('name');

  if (error) {
    console.error('Error fetching positions by department:', error);
    return [];
  }

  return data || [];
}
