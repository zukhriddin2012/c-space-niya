import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ==========================================
// GROWTH TEAM FUNCTIONS
// ==========================================

export interface GrowthProject {
  id: string;
  title: string;
  tag: string | null;
  priority: 'critical' | 'high' | 'strategic' | 'normal' | null;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  deadline: string | null;
  owner: string | null;
  accountable: string[] | null;
  description: string | null;
  details: Record<string, unknown> | null;
  actions: Record<string, unknown>[] | null;
  alert: string | null;
  sync_id: string | null;
  source_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthKeyDate {
  id: string;
  date: string;
  label: string;
  events: string;
  highlight: boolean;
  critical: boolean;
  sync_id: string | null;
  created_at: string;
}

export interface GrowthPersonalFocus {
  id: string;
  person: string;
  role: string | null;
  emoji: string | null;
  items: string[] | null;
  sync_date: string | null;
  sync_id: string | null;
  created_at: string;
}

export interface GrowthSync {
  id: string;
  title: string;
  sync_date: string;
  next_sync_date: string | null;
  next_sync_time: string | null;
  next_sync_focus: string[] | null;
  resolved: string[] | null;
  summary: Record<string, unknown> | null;
  decisions: Record<string, unknown> | null;
  raw_import: Record<string, unknown> | null;
  imported_by: string | null;
  created_at: string;
}

// Get all Growth Team members
export async function getGrowthTeamMembers(): Promise<{ id: string; employee_id: string; full_name: string; position: string; }[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('id, employee_id, full_name, position')
    .eq('is_growth_team', true)
    .in('status', ['active', 'probation'])
    .order('full_name');

  if (error) {
    console.error('Error fetching Growth Team members:', error);
    return [];
  }

  return data || [];
}

// Get all Growth Projects
export async function getGrowthProjects(status?: string): Promise<GrowthProject[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  let query = supabaseAdmin!
    .from('growth_projects')
    .select('*')
    .order('priority', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching Growth Projects:', error);
    return [];
  }

  return data || [];
}

// Get a single Growth Project
export async function getGrowthProjectById(id: string): Promise<GrowthProject | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('growth_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching Growth Project:', error);
    return null;
  }

  return data;
}

// Create a Growth Project
export async function createGrowthProject(project: Partial<GrowthProject>): Promise<{ success: boolean; project?: GrowthProject; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('growth_projects')
    .insert({
      title: project.title,
      tag: project.tag,
      priority: project.priority,
      status: project.status || 'pending',
      deadline: project.deadline,
      owner: project.owner,
      accountable: project.accountable,
      description: project.description,
      details: project.details,
      actions: project.actions,
      alert: project.alert,
      sync_id: project.sync_id,
      source_key: project.source_key,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating Growth Project:', error);
    return { success: false, error: error.message };
  }

  return { success: true, project: data };
}

// Update a Growth Project
export async function updateGrowthProject(id: string, updates: Partial<GrowthProject>): Promise<{ success: boolean; project?: GrowthProject; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('growth_projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating Growth Project:', error);
    return { success: false, error: error.message };
  }

  return { success: true, project: data };
}

// Get Key Dates
export async function getGrowthKeyDates(): Promise<GrowthKeyDate[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('growth_key_dates')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching Growth Key Dates:', error);
    return [];
  }

  return data || [];
}

// Get Personal Focus items
export async function getGrowthPersonalFocus(): Promise<GrowthPersonalFocus[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('growth_personal_focus')
    .select('*')
    .order('person', { ascending: true });

  if (error) {
    console.error('Error fetching Growth Personal Focus:', error);
    return [];
  }

  return data || [];
}

// Get latest Growth Sync
export async function getLatestGrowthSync(): Promise<GrowthSync | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('growth_syncs')
    .select('*')
    .order('sync_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    console.error('Error fetching latest Growth Sync:', error);
    return null;
  }

  return data;
}

// Create a Growth Sync (from Metronome Sync import)
export async function createGrowthSync(
  syncData: Partial<GrowthSync>,
  projects: Partial<GrowthProject>[],
  keyDates: Partial<GrowthKeyDate>[],
  personalFocus: Partial<GrowthPersonalFocus>[]
): Promise<{ success: boolean; sync?: GrowthSync; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Create the sync record
  const { data: sync, error: syncError } = await supabaseAdmin!
    .from('growth_syncs')
    .insert({
      title: syncData.title,
      sync_date: syncData.sync_date,
      next_sync_date: syncData.next_sync_date,
      next_sync_time: syncData.next_sync_time,
      next_sync_focus: syncData.next_sync_focus,
      resolved: syncData.resolved,
      summary: syncData.summary,
      decisions: syncData.decisions,
      raw_import: syncData.raw_import,
      imported_by: syncData.imported_by,
    })
    .select()
    .single();

  if (syncError) {
    console.error('Error creating Growth Sync:', syncError);
    return { success: false, error: syncError.message };
  }

  const syncId = sync.id;

  // Clear previous data (optional - you might want to keep history)
  // For now, we'll add new records with sync_id reference

  // Insert projects
  if (projects.length > 0) {
    const projectsWithSync = projects.map(p => ({ ...p, sync_id: syncId }));
    const { error: projectsError } = await supabaseAdmin!
      .from('growth_projects')
      .insert(projectsWithSync);

    if (projectsError) {
      console.error('Error inserting Growth Projects:', projectsError);
    }
  }

  // Insert key dates
  if (keyDates.length > 0) {
    const datesWithSync = keyDates.map(d => ({ ...d, sync_id: syncId }));
    const { error: datesError } = await supabaseAdmin!
      .from('growth_key_dates')
      .insert(datesWithSync);

    if (datesError) {
      console.error('Error inserting Growth Key Dates:', datesError);
    }
  }

  // Insert personal focus
  if (personalFocus.length > 0) {
    const focusWithSync = personalFocus.map(f => ({ ...f, sync_id: syncId }));
    const { error: focusError } = await supabaseAdmin!
      .from('growth_personal_focus')
      .insert(focusWithSync);

    if (focusError) {
      console.error('Error inserting Growth Personal Focus:', focusError);
    }
  }

  return { success: true, sync };
}

// Get all Growth Syncs
export async function getGrowthSyncs(): Promise<GrowthSync[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('growth_syncs')
    .select('*')
    .order('sync_date', { ascending: false });

  if (error) {
    console.error('Error fetching Growth Syncs:', error);
    return [];
  }

  return data || [];
}
