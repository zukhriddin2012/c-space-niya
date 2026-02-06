import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';
import { escapeIlike } from '@/lib/security';
import {
  transformMaintenanceIssue,
  transformMaintenanceAttachment,
  transformMaintenanceStatusChange,
  MAINTENANCE_STATUS_TRANSITIONS,
  type MaintenanceIssue,
  type MaintenanceIssueRow,
  type MaintenanceAttachment,
  type MaintenanceAttachmentRow,
  type MaintenanceStatusChange,
  type MaintenanceStatusChangeRow,
  type MaintenanceIssueFilters,
  type MaintenanceDashboardStats,
  type MaintenanceStatus,
  type CreateMaintenanceIssueInput,
  type UpdateMaintenanceIssueInput,
} from '@/modules/maintenance/types';

// ============================================
// GET MAINTENANCE ISSUES (with filters, pagination, counts)
// ============================================

export interface GetMaintenanceIssuesResult {
  data: MaintenanceIssue[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
  urgencyCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export async function getMaintenanceIssues(
  filters: MaintenanceIssueFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<GetMaintenanceIssuesResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      data: [],
      pagination: { total: 0, page, pageSize, pageCount: 0 },
      urgencyCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }

  try {
    // Build the query
    let query = supabaseAdmin!
      .from('maintenance_issues')
      .select('*', { count: 'exact' })
      .is('voided_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters.urgency && filters.urgency.length > 0) {
      query = query.in('urgency', filters.urgency);
    }

    if (filters.branchId) {
      query = query.eq('branch_id', filters.branchId);
    }

    if (filters.search) {
      // C-05: Escape ILIKE wildcards in search
      const escapedSearch = escapeIlike(filters.search);
      query = query.or(
        `description.ilike.%${escapedSearch}%,location_description.ilike.%${escapedSearch}%`
      );
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.slaBreached === true) {
      query = query.eq('sla_breached', true);
    } else if (filters.slaBreached === false) {
      query = query.eq('sla_breached', false);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching maintenance issues:', error);
      return {
        data: [],
        pagination: { total: 0, page, pageSize, pageCount: 0 },
        urgencyCounts: { critical: 0, high: 0, medium: 0, low: 0 },
      };
    }

    // Transform data
    const transformedData: MaintenanceIssue[] = (data || []).map(row => {
      const issue: MaintenanceIssue = {
        id: row.id,
        issueNumber: row.issue_number,
        category: row.category,
        urgency: row.urgency,
        status: row.status,
        branchId: row.branch_id,
        locationDescription: row.location_description,
        description: row.description,
        reportedBy: row.reported_by,
        reportedByOperator: row.reported_by_operator ?? undefined,
        assignedTo: row.assigned_to ?? undefined,
        assignedAt: row.assigned_at ?? undefined,
        resolutionNotes: row.resolution_notes ?? undefined,
        resolvedAt: row.resolved_at ?? undefined,
        resolvedBy: row.resolved_by ?? undefined,
        slaDeadline: row.sla_deadline ?? undefined,
        slaBreached: row.sla_breached,
        voidedAt: row.voided_at ?? undefined,
        voidedBy: row.voided_by ?? undefined,
        voidReason: row.void_reason ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      return issue;
    });

    // Calculate urgency counts from returned data (all non-voided issues, not just this page)
    let urgencyQuery = supabaseAdmin!
      .from('maintenance_issues')
      .select('urgency')
      .is('voided_at', null)
      .in('status', filters.status || ['open', 'in_progress', 'resolved']);

    // BUG FIX: Apply branchId filter to urgency counts — without this, counts are global
    if (filters.branchId) {
      urgencyQuery = urgencyQuery.eq('branch_id', filters.branchId);
    }

    const { data: allIssues, error: countError } = await urgencyQuery;

    const urgencyCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    if (!countError && allIssues) {
      for (const issue of allIssues) {
        const urgency = issue.urgency as keyof typeof urgencyCounts;
        if (urgency in urgencyCounts) {
          urgencyCounts[urgency]++;
        }
      }
    }

    const total = count || 0;
    const pageCount = Math.ceil(total / pageSize);

    return {
      data: transformedData,
      pagination: { total, page, pageSize, pageCount },
      urgencyCounts,
    };
  } catch (error) {
    console.error('Error in getMaintenanceIssues:', error);
    return {
      data: [],
      pagination: { total: 0, page, pageSize, pageCount: 0 },
      urgencyCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }
}

// ============================================
// GET MAINTENANCE ISSUE BY ID (with attachments and status history)
// ============================================

export async function getMaintenanceIssueById(id: string): Promise<MaintenanceIssue | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  try {
    // Get the main issue
    const { data, error } = await supabaseAdmin!
      .from('maintenance_issues')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching maintenance issue:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Get attachments separately
    const { data: attachmentsData, error: attachmentsError } = await supabaseAdmin!
      .from('maintenance_issue_attachments')
      .select('*')
      .eq('issue_id', id)
      .order('created_at', { ascending: false });

    if (attachmentsError) {
      console.error('Error fetching maintenance attachments:', attachmentsError);
    }

    // Get status history separately
    const { data: statusHistoryData, error: statusHistoryError } = await supabaseAdmin!
      .from('maintenance_status_changes')
      .select('*')
      .eq('issue_id', id)
      .order('created_at', { ascending: true });

    if (statusHistoryError) {
      console.error('Error fetching maintenance status history:', statusHistoryError);
    }

    // Transform and combine
    const issue: MaintenanceIssue = {
      id: data.id,
      issueNumber: data.issue_number,
      category: data.category,
      urgency: data.urgency,
      status: data.status,
      branchId: data.branch_id,
      locationDescription: data.location_description,
      description: data.description,
      reportedBy: data.reported_by,
      reportedByOperator: data.reported_by_operator ?? undefined,
      assignedTo: data.assigned_to ?? undefined,
      assignedAt: data.assigned_at ?? undefined,
      resolutionNotes: data.resolution_notes ?? undefined,
      resolvedAt: data.resolved_at ?? undefined,
      resolvedBy: data.resolved_by ?? undefined,
      slaDeadline: data.sla_deadline ?? undefined,
      slaBreached: data.sla_breached,
      voidedAt: data.voided_at ?? undefined,
      voidedBy: data.voided_by ?? undefined,
      voidReason: data.void_reason ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      attachments: (attachmentsData || []).map((row: MaintenanceAttachmentRow) => ({
        id: row.id,
        issueId: row.issue_id,
        fileName: row.file_name,
        fileType: row.file_type,
        fileSize: row.file_size,
        fileUrl: row.file_url,
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at,
      })),
      statusHistory: (statusHistoryData || []).map((row: MaintenanceStatusChangeRow) => ({
        id: row.id,
        issueId: row.issue_id,
        oldStatus: row.old_status,
        newStatus: row.new_status,
        changedBy: row.changed_by,
        notes: row.notes ?? undefined,
        createdAt: row.created_at,
      })),
    };

    return issue;
  } catch (error) {
    console.error('Error in getMaintenanceIssueById:', error);
    return null;
  }
}

// ============================================
// CREATE MAINTENANCE ISSUE
// ============================================

export async function createMaintenanceIssue(
  input: CreateMaintenanceIssueInput,
  reportedBy: string,
  operatorId?: string
): Promise<{ success: boolean; data?: MaintenanceIssue; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    // Generate issue number via RPC
    const { data: issueNumberData, error: rpcError } = await supabaseAdmin!.rpc(
      'next_maintenance_issue_number'
    );

    if (rpcError) {
      console.error('Error generating issue number:', rpcError);
      return { success: false, error: rpcError.message };
    }

    if (!issueNumberData) {
      console.error('RPC returned null issue number');
      return { success: false, error: 'Failed to generate issue number' };
    }

    const issueNumber = issueNumberData;

    // Create the maintenance issue
    const { data, error } = await supabaseAdmin!
      .from('maintenance_issues')
      .insert({
        issue_number: issueNumber,
        category: input.category,
        urgency: input.urgency,
        status: 'open',
        branch_id: input.branchId,
        location_description: input.locationDescription,
        description: input.description,
        reported_by: reportedBy,
        reported_by_operator: operatorId || null,
        sla_breached: false,
        voided_at: null,
        voided_by: null,
        void_reason: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating maintenance issue:', error);
      return { success: false, error: error.message };
    }

    // Insert initial status history (null → open)
    const { error: historyError } = await supabaseAdmin!
      .from('maintenance_status_changes')
      .insert({
        issue_id: data.id,
        old_status: null,
        new_status: 'open',
        changed_by: reportedBy,
        notes: 'Issue created',
      });

    if (historyError) {
      console.error('Error creating status history:', historyError);
      // Don't fail the whole operation, just log it
    }

    // Transform and return
    const issue: MaintenanceIssue = {
      id: data.id,
      issueNumber: data.issue_number,
      category: data.category,
      urgency: data.urgency,
      status: data.status,
      branchId: data.branch_id,
      locationDescription: data.location_description,
      description: data.description,
      reportedBy: data.reported_by,
      reportedByOperator: data.reported_by_operator ?? undefined,
      assignedTo: data.assigned_to ?? undefined,
      assignedAt: data.assigned_at ?? undefined,
      resolutionNotes: data.resolution_notes ?? undefined,
      resolvedAt: data.resolved_at ?? undefined,
      resolvedBy: data.resolved_by ?? undefined,
      slaDeadline: data.sla_deadline ?? undefined,
      slaBreached: data.sla_breached,
      voidedAt: data.voided_at ?? undefined,
      voidedBy: data.voided_by ?? undefined,
      voidReason: data.void_reason ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { success: true, data: issue };
  } catch (error) {
    console.error('Error in createMaintenanceIssue:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// UPDATE MAINTENANCE ISSUE
// ============================================

export async function updateMaintenanceIssue(
  id: string,
  input: UpdateMaintenanceIssueInput,
  changedBy: string
): Promise<{ success: boolean; data?: MaintenanceIssue; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    // Get current issue first
    const { data: currentIssue, error: fetchError } = await supabaseAdmin!
      .from('maintenance_issues')
      .select('status, resolved_at, resolved_by')
      .eq('id', id)
      .single();

    if (fetchError || !currentIssue) {
      console.error('Error fetching current issue:', fetchError);
      return { success: false, error: 'Issue not found' };
    }

    // Validate status transition if status is being changed
    if (input.status && input.status !== currentIssue.status) {
      const TRANSITIONS: Record<string, string[]> = {
        open: ['in_progress', 'resolved'],
        in_progress: ['resolved', 'open'],
        resolved: [],
      };

      const validTransitions: string[] = TRANSITIONS[currentIssue.status] || [];
      if (!validTransitions.includes(input.status as string)) {
        return {
          success: false,
          error: `Cannot transition from ${currentIssue.status} to ${input.status}`,
        };
      }
    }

    // Prepare update object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.assignedTo !== undefined) {
      updateData.assigned_to = input.assignedTo;
      updateData.assigned_at = input.assignedTo ? new Date().toISOString() : null;
    }

    if (input.resolutionNotes !== undefined) {
      updateData.resolution_notes = input.resolutionNotes;
    }

    // If resolving, set resolved_at and resolved_by
    if (input.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = changedBy;
    }

    // Update the issue
    const { data, error } = await supabaseAdmin!
      .from('maintenance_issues')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating maintenance issue:', error);
      return { success: false, error: error.message };
    }

    // Insert status history if status changed
    if (input.status && input.status !== currentIssue.status) {
      const { error: historyError } = await supabaseAdmin!
        .from('maintenance_status_changes')
        .insert({
          issue_id: id,
          old_status: currentIssue.status,
          new_status: input.status,
          changed_by: changedBy,
          notes: input.resolutionNotes ? `Updated to ${input.status}: ${input.resolutionNotes}` : undefined,
        });

      if (historyError) {
        console.error('Error creating status history:', historyError);
      }
    }

    // Transform and return
    const issue: MaintenanceIssue = {
      id: data.id,
      issueNumber: data.issue_number,
      category: data.category,
      urgency: data.urgency,
      status: data.status,
      branchId: data.branch_id,
      locationDescription: data.location_description,
      description: data.description,
      reportedBy: data.reported_by,
      reportedByOperator: data.reported_by_operator ?? undefined,
      assignedTo: data.assigned_to ?? undefined,
      assignedAt: data.assigned_at ?? undefined,
      resolutionNotes: data.resolution_notes ?? undefined,
      resolvedAt: data.resolved_at ?? undefined,
      resolvedBy: data.resolved_by ?? undefined,
      slaDeadline: data.sla_deadline ?? undefined,
      slaBreached: data.sla_breached,
      voidedAt: data.voided_at ?? undefined,
      voidedBy: data.voided_by ?? undefined,
      voidReason: data.void_reason ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { success: true, data: issue };
  } catch (error) {
    console.error('Error in updateMaintenanceIssue:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// ADD MAINTENANCE ATTACHMENT
// ============================================

export async function addMaintenanceAttachment(
  issueId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  fileUrl: string,
  uploadedBy: string
): Promise<MaintenanceAttachment | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin!
      .from('maintenance_issue_attachments')
      .insert({
        issue_id: issueId,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        file_url: fileUrl,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding maintenance attachment:', error);
      return null;
    }

    return {
      id: data.id,
      issueId: data.issue_id,
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      fileUrl: data.file_url,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Error in addMaintenanceAttachment:', error);
    return null;
  }
}

// ============================================
// GET MAINTENANCE STATS
// ============================================

export async function getMaintenanceStats(branchId?: string): Promise<MaintenanceDashboardStats> {
  if (!isSupabaseAdminConfigured()) {
    return {
      total: 0,
      byStatus: { open: 0, in_progress: 0, resolved: 0 },
      byUrgency: { critical: 0, high: 0, medium: 0, low: 0 },
      slaBreachedCount: 0,
      urgencyCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }

  try {
    // Get all non-voided issues
    let query = supabaseAdmin!
      .from('maintenance_issues')
      .select('status, urgency, sla_breached')
      .is('voided_at', null);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching maintenance stats:', error);
      return {
        total: 0,
        byStatus: { open: 0, in_progress: 0, resolved: 0 },
        byUrgency: { critical: 0, high: 0, medium: 0, low: 0 },
        slaBreachedCount: 0,
        urgencyCounts: { critical: 0, high: 0, medium: 0, low: 0 },
      };
    }

    const stats = {
      total: data?.length || 0,
      byStatus: { open: 0, in_progress: 0, resolved: 0 },
      byUrgency: { critical: 0, high: 0, medium: 0, low: 0 },
      slaBreachedCount: 0,
      urgencyCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    };

    if (data) {
      for (const issue of data) {
        const status = issue.status as keyof typeof stats.byStatus;
        const urgency = issue.urgency as keyof typeof stats.byUrgency;

        // Count by status
        if (status in stats.byStatus) stats.byStatus[status]++;

        // Count by urgency
        if (urgency in stats.byUrgency) stats.byUrgency[urgency]++;

        // Count urgency (duplicate key for compatibility)
        if (urgency in stats.urgencyCounts) stats.urgencyCounts[urgency]++;

        // Count SLA breached
        if (issue.sla_breached) {
          stats.slaBreachedCount++;
        }
      }
    }

    return stats;
  } catch (error) {
    console.error('Error in getMaintenanceStats:', error);
    return {
      total: 0,
      byStatus: { open: 0, in_progress: 0, resolved: 0 },
      byUrgency: { critical: 0, high: 0, medium: 0, low: 0 },
      slaBreachedCount: 0,
      urgencyCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }
}

// ============================================
// VOID MAINTENANCE ISSUE (soft delete)
// ============================================

export async function voidMaintenanceIssue(
  id: string,
  voidedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { error } = await supabaseAdmin!
      .from('maintenance_issues')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: voidedBy,
        void_reason: reason,
      })
      .eq('id', id);

    if (error) {
      console.error('Error voiding maintenance issue:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in voidMaintenanceIssue:', error);
    return { success: false, error: String(error) };
  }
}
