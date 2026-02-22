import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ============================================
// TYPES
// ============================================

export type LeadStage = 'new' | 'contacted' | 'tour_scheduled' | 'proposal' | 'won' | 'lost';
export type LeadPriority = 'hot' | 'warm' | 'medium' | 'cold';
export type InterestType = 'hot_desk' | 'fixed_desk' | 'private_office' | 'meeting_room' | 'event_space' | 'virtual_office' | 'other';
export type BudgetRange = 'under_1m' | '1m_3m' | '3m_5m' | '5m_10m' | 'above_10m' | 'unknown';
export type LeadActivityType =
  | 'call_logged'
  | 'walk_in_logged'
  | 'note_added'
  | 'stage_changed'
  | 'assigned'
  | 'tour_completed'
  | 'proposal_sent'
  | 'follow_up_set'
  | 'email_sent'
  | 'telegram_message'
  | 'won'
  | 'lost';

export interface LeadSource {
  id: string;
  label: string;
  icon: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  industry: string | null;
  position: string | null;
  source_id: string;
  source_details: string | null;
  interest_type: InterestType;
  team_size: number | null;
  budget_range: BudgetRange | null;
  stage: LeadStage;
  stage_changed_at: string;
  lost_reason: string | null;
  assigned_to: string | null;
  captured_by: string;
  branch_id: string;
  priority: LeadPriority;
  next_follow_up_at: string | null;
  next_follow_up_note: string | null;
  client_id: string | null;
  deal_value: number | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  source?: { id: string; label: string; icon: string | null };
  captured_by_employee?: { id: string; full_name: string };
  assigned_to_employee?: { id: string; full_name: string } | null;
  client?: { id: string; name: string } | null;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: LeadActivityType;
  description: string | null;
  metadata: Record<string, unknown>;
  performed_by: string;
  created_at: string;
  // Joined
  performed_by_employee?: { id: string; full_name: string };
}

// ============================================
// SHARED SELECT PATTERNS
// ============================================

const LEAD_SELECT = `
  *,
  source:lead_sources!source_id(id, label, icon),
  captured_by_employee:employees!leads_captured_by_fkey(id, full_name),
  assigned_to_employee:employees!leads_assigned_to_fkey(id, full_name),
  client:clients!leads_client_id_fkey(id, name)
`;

const ACTIVITY_SELECT = `
  *,
  performed_by_employee:employees!lead_activities_performed_by_fkey(id, full_name)
`;

// ============================================
// DUPLICATE DETECTION
// ============================================

export interface DuplicateMatch {
  match_type: 'phone' | 'name';
  lead_id: string;
  full_name: string;
  stage: string;
  created_at: string;
  similarity_score: number;
}

export async function checkLeadDuplicates(params: {
  phone?: string | null;
  fullName?: string | null;
  branchId: string;
}): Promise<DuplicateMatch[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!.rpc('check_lead_duplicates', {
    p_phone: params.phone || null,
    p_full_name: params.fullName || null,
    p_branch_id: params.branchId,
  });

  if (error) {
    console.error('Error checking lead duplicates:', error);
    return [];
  }

  return (data as DuplicateMatch[]) || [];
}

/**
 * Build a human-readable duplicate warning from the best match.
 * Phone matches are prioritized over name matches.
 */
export function buildDuplicateWarning(matches: DuplicateMatch[]): {
  existing_lead_id: string;
  existing_lead_name: string;
  message: string;
} | null {
  if (matches.length === 0) return null;

  const best = matches[0]; // Already sorted: phone first, then by similarity desc
  const daysAgo = Math.floor(
    (Date.now() - new Date(best.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  let message: string;
  if (best.match_type === 'phone') {
    message = `This number was logged ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago as ${best.full_name} (${best.stage}). Log anyway?`;
  } else {
    const pct = Math.round(best.similarity_score * 100);
    message = `Similar name found: ${best.full_name} (${best.stage}, ${pct}% match) at this branch. Log anyway?`;
  }

  return {
    existing_lead_id: best.lead_id,
    existing_lead_name: best.full_name,
    message,
  };
}

// ============================================
// LEAD SOURCES
// ============================================

export async function getLeadSources(): Promise<LeadSource[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('lead_sources')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching lead sources:', error);
    return [];
  }

  return data || [];
}

// ============================================
// LEADS — READ
// ============================================

export async function getLeads(options: {
  branchId?: string;
  stage?: LeadStage;
  assignedTo?: string;
  capturedBy?: string;
  priority?: LeadPriority;
  sourceId?: string;
  isArchived?: boolean;
} = {}): Promise<Lead[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('leads')
    .select(LEAD_SELECT)
    .order('created_at', { ascending: false });

  // Default: exclude archived leads unless explicitly requested
  query = query.eq('is_archived', options.isArchived ?? false);

  if (options.branchId) {
    query = query.eq('branch_id', options.branchId);
  }
  if (options.stage) {
    query = query.eq('stage', options.stage);
  }
  if (options.assignedTo) {
    query = query.eq('assigned_to', options.assignedTo);
  }
  if (options.capturedBy) {
    query = query.eq('captured_by', options.capturedBy);
  }
  if (options.priority) {
    query = query.eq('priority', options.priority);
  }
  if (options.sourceId) {
    query = query.eq('source_id', options.sourceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }

  return data || [];
}

export async function getLeadById(id: string): Promise<Lead | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('leads')
    .select(LEAD_SELECT)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching lead:', error);
    return null;
  }

  return data;
}

// ============================================
// LEADS — WRITE
// ============================================

export async function createLead(leadData: {
  full_name: string;
  source_id: string;
  interest_type: InterestType;
  captured_by: string;
  branch_id: string;
  phone?: string | null;
  email?: string | null;
  company_name?: string | null;
  industry?: string | null;
  position?: string | null;
  source_details?: string | null;
  team_size?: number | null;
  budget_range?: BudgetRange | null;
  priority?: LeadPriority;
  assigned_to?: string | null;
  next_follow_up_at?: string | null;
  next_follow_up_note?: string | null;
  deal_value?: number | null;
  notes?: string | null;
}): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('leads')
    .insert({
      ...leadData,
      stage: 'new',
      priority: leadData.priority ?? 'medium',
      is_archived: false,
    })
    .select(LEAD_SELECT)
    .single();

  if (error) {
    console.error('Error creating lead:', error);
    return { success: false, error: error.message };
  }

  return { success: true, lead: data };
}

export async function updateLead(
  id: string,
  updates: {
    full_name?: string;
    phone?: string | null;
    email?: string | null;
    company_name?: string | null;
    industry?: string | null;
    position?: string | null;
    source_id?: string;
    source_details?: string | null;
    interest_type?: InterestType;
    team_size?: number | null;
    budget_range?: BudgetRange | null;
    priority?: LeadPriority;
    next_follow_up_at?: string | null;
    next_follow_up_note?: string | null;
    deal_value?: number | null;
    notes?: string | null;
    lost_reason?: string | null;
    client_id?: string | null;
  }
): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select(LEAD_SELECT)
    .single();

  if (error) {
    console.error('Error updating lead:', error);
    return { success: false, error: error.message };
  }

  return { success: true, lead: data };
}

export async function updateLeadStage(
  id: string,
  newStage: LeadStage,
  performedBy: string,
  lostReason?: string
): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Get current lead to record the "from" stage
  const currentLead = await getLeadById(id);
  if (!currentLead) {
    return { success: false, error: 'Lead not found' };
  }

  const updates: Record<string, unknown> = {
    stage: newStage,
    stage_changed_at: new Date().toISOString(),
  };

  if (newStage === 'lost' && lostReason) {
    updates.lost_reason = lostReason;
  }

  const { data, error } = await supabaseAdmin!
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select(LEAD_SELECT)
    .single();

  if (error) {
    console.error('Error updating lead stage:', error);
    return { success: false, error: error.message };
  }

  // Auto-create stage_changed activity
  await createLeadActivity({
    lead_id: id,
    activity_type: 'stage_changed',
    description: `Stage changed from ${currentLead.stage} to ${newStage}`,
    metadata: { from: currentLead.stage, to: newStage },
    performed_by: performedBy,
  });

  return { success: true, lead: data };
}

export async function assignLead(
  id: string,
  assignedTo: string,
  performedBy: string
): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Get current lead to record the previous assignment
  const currentLead = await getLeadById(id);
  if (!currentLead) {
    return { success: false, error: 'Lead not found' };
  }

  const { data, error } = await supabaseAdmin!
    .from('leads')
    .update({ assigned_to: assignedTo })
    .eq('id', id)
    .select(LEAD_SELECT)
    .single();

  if (error) {
    console.error('Error assigning lead:', error);
    return { success: false, error: error.message };
  }

  // Auto-create assigned activity
  await createLeadActivity({
    lead_id: id,
    activity_type: 'assigned',
    description: `Lead assigned`,
    metadata: {
      from_employee_id: currentLead.assigned_to,
      to_employee_id: assignedTo,
    },
    performed_by: performedBy,
  });

  return { success: true, lead: data };
}

export async function archiveLead(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('leads')
    .update({ is_archived: true })
    .eq('id', id);

  if (error) {
    console.error('Error archiving lead:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// LEAD ACTIVITIES
// ============================================

export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('lead_activities')
    .select(ACTIVITY_SELECT)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lead activities:', error);
    return [];
  }

  return data || [];
}

export async function createLeadActivity(activityData: {
  lead_id: string;
  activity_type: LeadActivityType;
  performed_by: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; activity?: LeadActivity; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('lead_activities')
    .insert({
      ...activityData,
      metadata: activityData.metadata ?? {},
    })
    .select(ACTIVITY_SELECT)
    .single();

  if (error) {
    console.error('Error creating lead activity:', error);
    return { success: false, error: error.message };
  }

  return { success: true, activity: data };
}

// ============================================
// LEAD → CLIENT CONVERSION
// ============================================

export interface ConvertedClient {
  id: string;
  name: string;
  client_type: string;
  phone: string | null;
  industry: string | null;
  branch_id: string;
}

export async function convertLeadToClient(
  leadId: string,
  options: {
    client_name?: string;
    client_type?: 'company' | 'individual';
  },
  performedBy: string
): Promise<
  | { success: true; client: ConvertedClient; isExisting: boolean; lead: Lead }
  | { success: false; error: string }
> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // 1. Fetch lead — must exist, not archived, stage must be 'won'
  const lead = await getLeadById(leadId);
  if (!lead) {
    return { success: false, error: 'Lead not found' };
  }
  if (lead.is_archived) {
    return { success: false, error: 'Cannot convert an archived lead' };
  }
  if (lead.stage !== 'won') {
    return { success: false, error: 'Lead must be in "won" stage to convert' };
  }
  if (lead.client_id) {
    return { success: false, error: 'Lead is already converted to a client' };
  }

  // 2. Derive client attributes
  const clientName = options.client_name ?? lead.company_name ?? lead.full_name;
  const clientType = options.client_type ?? (lead.company_name ? 'company' : 'individual');
  const normalizedName = clientName.trim().toLowerCase().replace(/\s+/g, ' ');

  // 3. Check for existing client by normalized name + branch
  let client: ConvertedClient | null = null;
  let isExisting = false;

  const { data: existing } = await supabaseAdmin!
    .from('clients')
    .select('id, name, client_type, phone, industry, branch_id')
    .eq('name_normalized', normalizedName)
    .eq('branch_id', lead.branch_id)
    .maybeSingle();

  if (existing) {
    client = existing;
    isExisting = true;
  } else {
    // 4. Create new client
    const { data: newClient, error: createError } = await supabaseAdmin!
      .from('clients')
      .insert({
        name: clientName.trim(),
        name_normalized: normalizedName,
        client_type: clientType,
        phone: lead.phone || null,
        industry: lead.industry || null,
        branch_id: lead.branch_id,
        is_active: true,
      })
      .select('id, name, client_type, phone, industry, branch_id')
      .single();

    if (createError) {
      console.error('Error creating client from lead:', createError);
      return { success: false, error: createError.message };
    }

    client = newClient;
  }

  // 5. Link lead to client
  const updateResult = await updateLead(leadId, { client_id: client!.id });
  if (!updateResult.success) {
    return { success: false, error: updateResult.error ?? 'Failed to link lead to client' };
  }

  // 6. Log activity
  await createLeadActivity({
    lead_id: leadId,
    activity_type: 'won',
    description: isExisting
      ? `Linked to existing client: ${client!.name}`
      : `Converted to new client: ${client!.name}`,
    metadata: {
      client_id: client!.id,
      client_name: client!.name,
      is_existing: isExisting,
    },
    performed_by: performedBy,
  });

  return { success: true, client: client!, isExisting, lead: updateResult.lead! };
}

// ============================================
// STATS
// ============================================

export async function getLeadStats(branchId?: string): Promise<{
  total: number;
  byStage: Record<LeadStage, number>;
  bySource: Record<string, number>;
  byPriority: Record<LeadPriority, number>;
  thisMonth: number;
  wonThisMonth: number;
}> {
  const emptyStats = {
    total: 0,
    byStage: { new: 0, contacted: 0, tour_scheduled: 0, proposal: 0, won: 0, lost: 0 },
    bySource: {},
    byPriority: { hot: 0, warm: 0, medium: 0, cold: 0 },
    thisMonth: 0,
    wonThisMonth: 0,
  };

  if (!isSupabaseAdminConfigured()) {
    return emptyStats;
  }

  let query = supabaseAdmin!
    .from('leads')
    .select('stage, source_id, priority, created_at, stage_changed_at')
    .eq('is_archived', false);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: leads, error } = await query;

  if (error) {
    console.error('Error fetching lead stats:', error);
    return emptyStats;
  }

  const byStage: Record<LeadStage, number> = { new: 0, contacted: 0, tour_scheduled: 0, proposal: 0, won: 0, lost: 0 };
  const bySource: Record<string, number> = {};
  const byPriority: Record<LeadPriority, number> = { hot: 0, warm: 0, medium: 0, cold: 0 };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let thisMonth = 0;
  let wonThisMonth = 0;

  leads?.forEach((lead) => {
    byStage[lead.stage as LeadStage]++;
    byPriority[lead.priority as LeadPriority]++;
    bySource[lead.source_id] = (bySource[lead.source_id] || 0) + 1;

    if (new Date(lead.created_at) >= startOfMonth) {
      thisMonth++;
    }
    if (lead.stage === 'won' && lead.stage_changed_at && new Date(lead.stage_changed_at) >= startOfMonth) {
      wonThisMonth++;
    }
  });

  return {
    total: leads?.length || 0,
    byStage,
    bySource,
    byPriority,
    thisMonth,
    wonThisMonth,
  };
}
