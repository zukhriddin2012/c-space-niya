import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ============================================
// HELPERS
// ============================================

/** SEC-C1: Sanitize search input to prevent PostgREST filter injection.
 *  Strips commas, dots-as-operators, and percent signs that could
 *  manipulate `.or()` filter syntax. */
function sanitizeSearch(raw: string): string {
  return raw.replace(/[,%.()]/g, '').trim().slice(0, 200);
}

/** Validate UUID v4 format */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// ============================================
// METRONOME SYNC TYPES
// ============================================

export type MetronomeFunctionTag =
  | 'bd' | 'construction' | 'hr' | 'finance'
  | 'legal' | 'strategy' | 'service';

export type MetronomePriority =
  | 'critical' | 'high' | 'strategic' | 'resolved';

export type MetronomeActionStatus =
  | 'pending' | 'in_progress' | 'done' | 'blocked';

export type MetronomeDecisionStatus =
  | 'open' | 'decided' | 'deferred';

export type MetronomeKeyDateCategory =
  | 'critical' | 'high' | 'meeting' | 'strategic' | 'event' | 'holiday';

// ─── Database Row Types (snake_case) ───

export interface MetronomeInitiativeRow {
  id: string;
  title: string;
  description: string | null;
  function_tag: MetronomeFunctionTag;
  priority: MetronomePriority;
  accountable_ids: string[];
  owner_label: string | null;
  status_label: string | null;
  deadline: string | null;
  deadline_label: string | null;
  is_archived: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MetronomeActionItemRow {
  id: string;
  initiative_id: string;
  title: string;
  status: MetronomeActionStatus;
  assigned_to: string | null;
  deadline: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MetronomeDecisionRow {
  id: string;
  question: string;
  initiative_id: string | null;
  function_tag: MetronomeFunctionTag | null;
  status: MetronomeDecisionStatus;
  decision_text: string | null;
  decided_by: string | null;
  decided_at: string | null;
  deadline: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FocusAreaEntry {
  person: string;
  items: string[];
}

export interface MetronomeSyncRow {
  id: string;
  sync_date: string;
  title: string | null;
  notes: string | null;
  attendee_ids: string[];
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  next_sync_date: string | null;
  next_sync_focus: string | null;
  focus_areas: FocusAreaEntry[];
  items_discussed: number;
  decisions_made: number;
  action_items_completed: number;
  created_by: string;
  created_at: string;
}

export interface MetronomeKeyDateRow {
  id: string;
  date: string;
  title: string;
  emoji: string | null;
  category: MetronomeKeyDateCategory;
  initiative_id: string | null;
  is_recurring: boolean;
  created_by: string;
  created_at: string;
}

// ─── Domain Types (camelCase) ───

export interface MetronomeInitiative {
  id: string;
  title: string;
  description: string | null;
  functionTag: MetronomeFunctionTag;
  priority: MetronomePriority;
  accountableIds: string[];
  ownerLabel: string | null;
  statusLabel: string | null;
  deadline: string | null;
  deadlineLabel: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  actionItems?: MetronomeActionItem[];
  decisions?: MetronomeDecision[];
}

export interface MetronomeActionItem {
  id: string;
  initiativeId: string;
  title: string;
  status: MetronomeActionStatus;
  assignedTo: string | null;
  deadline: string | null;
  completedAt: string | null;
  sortOrder: number;
}

export interface MetronomeDecision {
  id: string;
  question: string;
  initiativeId: string | null;
  functionTag: MetronomeFunctionTag | null;
  status: MetronomeDecisionStatus;
  decisionText: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  deadline: string | null;
  createdBy: string;
}

export interface MetronomeSync {
  id: string;
  syncDate: string;
  title: string | null;
  notes: string | null;
  attendeeIds: string[];
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  nextSyncDate: string | null;
  nextSyncFocus: string | null;
  focusAreas: FocusAreaEntry[];
  itemsDiscussed: number;
  decisionsMade: number;
  actionItemsCompleted: number;
}

export interface MetronomeKeyDate {
  id: string;
  date: string;
  title: string;
  emoji: string | null;
  category: MetronomeKeyDateCategory;
  initiativeId: string | null;
  isRecurring: boolean;
}

export interface MetronomeSummary {
  totalActive: number;
  byPriority: Record<MetronomePriority, number>;
  byFunction: Record<MetronomeFunctionTag, number>;
  openDecisions: number;
  overdueActionItems: number;
  overdueDecisions: number;
  onTrackPercentage: number;
  nextSync: {
    date: string | null;
    daysUntil: number | null;
  };
  lastSync: {
    date: string | null;
  };
}


// ============================================
// INITIATIVES
// ============================================

export async function getMetronomeInitiatives(filters?: {
  priority?: MetronomePriority;
  functionTag?: MetronomeFunctionTag;
  isArchived?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<MetronomeInitiativeRow[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  let query = supabaseAdmin!
    .from('metronome_initiatives')
    .select('*')
    .order('sort_order', { ascending: true });

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.functionTag) {
    query = query.eq('function_tag', filters.functionTag);
  }
  if (filters?.isArchived !== undefined) {
    query = query.eq('is_archived', filters.isArchived);
  }
  if (filters?.search) {
    const safe = sanitizeSearch(filters.search);
    if (safe.length > 0) {
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching metronome initiatives:', error);
    return [];
  }

  return data || [];
}

export async function getMetronomeInitiativeById(
  id: string
): Promise<MetronomeInitiativeRow | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('metronome_initiatives')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching initiative by id:', error);
    return null;
  }

  return data;
}

export async function createMetronomeInitiative(
  data: Omit<MetronomeInitiativeRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; initiative?: MetronomeInitiativeRow; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data: result, error } = await supabaseAdmin!
    .from('metronome_initiatives')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating initiative:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true, initiative: result };
}

export async function updateMetronomeInitiative(
  id: string,
  updates: Partial<MetronomeInitiativeRow>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('metronome_initiatives')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating initiative:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true };
}


// ============================================
// ACTION ITEMS
// ============================================

export async function getActionItemsByInitiative(
  initiativeId: string
): Promise<MetronomeActionItemRow[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('metronome_action_items')
    .select('*')
    .eq('initiative_id', initiativeId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching action items:', error);
    return [];
  }

  return data || [];
}

/** SEC-H1: Single-row lookup for action item by ID (replaces full table scan) */
export async function getActionItemById(
  id: string
): Promise<MetronomeActionItemRow | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('metronome_action_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching action item by id:', error);
    return null;
  }

  return data;
}

export async function getActionItems(filters?: {
  status?: MetronomeActionStatus;
  assignedTo?: string;
  initiativeId?: string;
}): Promise<MetronomeActionItemRow[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  let query = supabaseAdmin!
    .from('metronome_action_items')
    .select('*')
    .order('sort_order', { ascending: true });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  if (filters?.initiativeId) {
    query = query.eq('initiative_id', filters.initiativeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching action items:', error);
    return [];
  }

  return data || [];
}

export async function createActionItem(
  data: Omit<MetronomeActionItemRow, 'id' | 'created_at' | 'updated_at' | 'completed_at'>
): Promise<{ success: boolean; actionItem?: MetronomeActionItemRow; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data: result, error } = await supabaseAdmin!
    .from('metronome_action_items')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating action item:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true, actionItem: result };
}

export async function updateActionItem(
  id: string,
  updates: Partial<MetronomeActionItemRow>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('metronome_action_items')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating action item:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true };
}

export async function deleteActionItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('metronome_action_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting action item:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true };
}

export async function reorderActionItems(
  items: Array<{ id: string; sort_order: number }>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Update each item's sort_order
  for (const item of items) {
    const { error } = await supabaseAdmin!
      .from('metronome_action_items')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id);

    if (error) {
      console.error('Error reordering action items:', error);
      return { success: false, error: 'Operation failed' };
    }
  }

  return { success: true };
}


// ============================================
// DECISIONS
// ============================================

export async function getMetronomeDecisions(filters?: {
  status?: MetronomeDecisionStatus;
  initiativeId?: string;
}): Promise<MetronomeDecisionRow[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  let query = supabaseAdmin!
    .from('metronome_decisions')
    .select('*')
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.initiativeId) {
    query = query.eq('initiative_id', filters.initiativeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching decisions:', error);
    return [];
  }

  return data || [];
}

/** SEC-C3: Single-row lookup for decision by ID (for ownership checks) */
export async function getDecisionById(
  id: string
): Promise<MetronomeDecisionRow | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('metronome_decisions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching decision by id:', error);
    return null;
  }

  return data;
}

export async function createMetronomeDecision(
  data: Omit<MetronomeDecisionRow, 'id' | 'created_at' | 'updated_at' | 'decided_at'>
): Promise<{ success: boolean; decision?: MetronomeDecisionRow; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data: result, error } = await supabaseAdmin!
    .from('metronome_decisions')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating decision:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true, decision: result };
}

export async function updateMetronomeDecision(
  id: string,
  updates: Partial<MetronomeDecisionRow>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('metronome_decisions')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating decision:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true };
}


// ============================================
// KEY DATES
// ============================================

export async function getMetronomeKeyDates(filters?: {
  from?: string;
  to?: string;
}): Promise<MetronomeKeyDateRow[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  let query = supabaseAdmin!
    .from('metronome_key_dates')
    .select('*')
    .order('date', { ascending: true });

  if (filters?.from) {
    query = query.gte('date', filters.from);
  }
  if (filters?.to) {
    query = query.lte('date', filters.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching key dates:', error);
    return [];
  }

  return data || [];
}

export async function createMetronomeKeyDate(
  data: Omit<MetronomeKeyDateRow, 'id' | 'created_at'>
): Promise<{ success: boolean; keyDate?: MetronomeKeyDateRow; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data: result, error } = await supabaseAdmin!
    .from('metronome_key_dates')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating key date:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true, keyDate: result };
}

export async function deleteMetronomeKeyDate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('metronome_key_dates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting key date:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true };
}


// ============================================
// SYNCS
// ============================================

export async function getMetronomeSyncs(filters?: {
  limit?: number;
  offset?: number;
}): Promise<MetronomeSyncRow[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  let query = supabaseAdmin!
    .from('metronome_syncs')
    .select('*')
    .order('sync_date', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching syncs:', error);
    return [];
  }

  return data || [];
}

export async function createMetronomeSync(
  data: Omit<MetronomeSyncRow, 'id' | 'created_at'>
): Promise<{ success: boolean; sync?: MetronomeSyncRow; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data: result, error } = await supabaseAdmin!
    .from('metronome_syncs')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating sync:', error);
    return { success: false, error: 'Operation failed' };
  }

  return { success: true, sync: result };
}


// ============================================
// SUMMARY (dashboard aggregation)
// ============================================

export async function getMetronomeSummary(): Promise<MetronomeSummary> {
  const defaultSummary: MetronomeSummary = {
    totalActive: 0,
    byPriority: { critical: 0, high: 0, strategic: 0, resolved: 0 },
    byFunction: { bd: 0, construction: 0, hr: 0, finance: 0, legal: 0, strategy: 0, service: 0 },
    openDecisions: 0,
    overdueActionItems: 0,
    overdueDecisions: 0,
    onTrackPercentage: 0,
    nextSync: { date: null, daysUntil: null },
    lastSync: { date: null },
  };

  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return defaultSummary;
  }

  try {
    // 1. Get active initiatives
    const { data: initiatives } = await supabaseAdmin!
      .from('metronome_initiatives')
      .select('id, priority, function_tag')
      .eq('is_archived', false);

    if (initiatives && initiatives.length > 0) {
      defaultSummary.totalActive = initiatives.length;

      for (const init of initiatives) {
        const p = init.priority as MetronomePriority;
        const f = init.function_tag as MetronomeFunctionTag;
        if (p in defaultSummary.byPriority) defaultSummary.byPriority[p]++;
        if (f in defaultSummary.byFunction) defaultSummary.byFunction[f]++;
      }
    }

    // 2. Count open decisions
    const { count: openDecCount } = await supabaseAdmin!
      .from('metronome_decisions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    defaultSummary.openDecisions = openDecCount || 0;

    // 3. Count overdue action items (deadline < today, status not done)
    const today = new Date().toISOString().split('T')[0];

    const { count: overdueActionCount } = await supabaseAdmin!
      .from('metronome_action_items')
      .select('*', { count: 'exact', head: true })
      .lt('deadline', today)
      .neq('status', 'done');

    defaultSummary.overdueActionItems = overdueActionCount || 0;

    // 4. Count overdue decisions (deadline < today, status = open)
    const { count: overdueDecCount } = await supabaseAdmin!
      .from('metronome_decisions')
      .select('*', { count: 'exact', head: true })
      .lt('deadline', today)
      .eq('status', 'open');

    defaultSummary.overdueDecisions = overdueDecCount || 0;

    // 5. Compute on-track percentage (SEC-H4: single query instead of N+1)
    if (initiatives && initiatives.length > 0) {
      const { data: allItems } = await supabaseAdmin!
        .from('metronome_action_items')
        .select('initiative_id, status');

      if (allItems && allItems.length > 0) {
        // Group by initiative_id
        const byInitiative: Record<string, { total: number; done: number }> = {};
        for (const item of allItems) {
          if (!byInitiative[item.initiative_id]) {
            byInitiative[item.initiative_id] = { total: 0, done: 0 };
          }
          byInitiative[item.initiative_id].total++;
          if (item.status === 'done') {
            byInitiative[item.initiative_id].done++;
          }
        }

        let onTrackCount = 0;
        for (const init of initiatives) {
          const counts = byInitiative[init.id];
          if (counts && counts.total > 0 && counts.done / counts.total >= 0.5) {
            onTrackCount++;
          }
        }

        defaultSummary.onTrackPercentage = Math.round(
          (onTrackCount / initiatives.length) * 100
        );
      }
    }

    // 6. Get last sync date (single query for both fields)
    const { data: lastSync } = await supabaseAdmin!
      .from('metronome_syncs')
      .select('sync_date, next_sync_date')
      .order('sync_date', { ascending: false })
      .limit(1)
      .single();

    if (lastSync) {
      defaultSummary.lastSync.date = lastSync.sync_date;

      if (lastSync.next_sync_date) {
        defaultSummary.nextSync.date = lastSync.next_sync_date;
        const nextDate = new Date(lastSync.next_sync_date);
        const todayDate = new Date(today);
        const diffTime = nextDate.getTime() - todayDate.getTime();
        defaultSummary.nextSync.daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    return defaultSummary;
  } catch (error) {
    console.error('Error computing metronome summary:', error);
    return defaultSummary;
  }
}
