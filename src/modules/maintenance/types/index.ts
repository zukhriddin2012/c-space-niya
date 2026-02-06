// ============================================
// MAINTENANCE MODULE TYPES
// Reception Mode v2 — Facility Issue Tracking
// ============================================

// ═══ Enums ═══

export type MaintenanceCategory =
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'furniture'
  | 'cleaning'
  | 'building'
  | 'it_network'
  | 'safety'
  | 'other';

export type MaintenanceUrgency = 'critical' | 'high' | 'medium' | 'low';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved';

// ═══ SLA constants ═══

export const URGENCY_SLA_HOURS: Record<MaintenanceUrgency, number> = {
  critical: 4,
  high: 24,
  medium: 72,   // 3 days
  low: 168,     // 7 days
};

// ═══ Label maps ═══

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  hvac: 'HVAC / Climate',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  furniture: 'Furniture',
  cleaning: 'Cleaning',
  building: 'Building / Structure',
  it_network: 'IT / Network',
  safety: 'Safety / Security',
  other: 'Other',
};

export const MAINTENANCE_URGENCY_LABELS: Record<MaintenanceUrgency, string> = {
  critical: 'Critical (4h)',
  high: 'High (24h)',
  medium: 'Medium (3 days)',
  low: 'Low (7 days)',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

// ═══ Status transition rules ═══

export const MAINTENANCE_STATUS_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  open: ['in_progress', 'resolved'],         // can assign or quick-fix
  in_progress: ['resolved', 'open'],          // resolve or reopen
  resolved: [],                                // terminal
};

// ═══ Urgency colors for UI ═══

export const URGENCY_COLORS: Record<MaintenanceUrgency, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

// ═══ Main domain type (camelCase) ═══

export interface MaintenanceIssue {
  id: string;
  issueNumber: string;
  category: MaintenanceCategory;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  branchId: string;
  branchName?: string;
  locationDescription: string;
  description: string;
  reportedBy: string;
  reportedByName?: string;
  reportedByOperator?: string;
  reportedByOperatorName?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  slaDeadline?: string;
  slaBreached: boolean;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  attachments?: MaintenanceAttachment[];
  statusHistory?: MaintenanceStatusChange[];
}

// ═══ Database row type (snake_case) ═══

export interface MaintenanceIssueRow {
  id: string;
  issue_number: string;
  category: MaintenanceCategory;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  branch_id: string;
  location_description: string;
  description: string;
  reported_by: string;
  reported_by_operator: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ═══ Transform: DB row → domain type ═══

export function transformMaintenanceIssue(row: MaintenanceIssueRow): MaintenanceIssue {
  return {
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
}

// ═══ Input types ═══

export interface CreateMaintenanceIssueInput {
  category: MaintenanceCategory;
  urgency: MaintenanceUrgency;
  branchId: string;
  locationDescription: string;
  description: string;
  photos?: File[];  // up to 5
}

export interface UpdateMaintenanceIssueInput {
  status?: MaintenanceStatus;
  assignedTo?: string;
  resolutionNotes?: string;
}

// ═══ Related types ═══

export interface MaintenanceAttachment {
  id: string;
  issueId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string;
}

export interface MaintenanceAttachmentRow {
  id: string;
  issue_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export function transformMaintenanceAttachment(row: MaintenanceAttachmentRow): MaintenanceAttachment {
  return {
    id: row.id,
    issueId: row.issue_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    fileUrl: row.file_url,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export interface MaintenanceStatusChange {
  id: string;
  issueId: string;
  oldStatus: MaintenanceStatus | null;
  newStatus: MaintenanceStatus;
  changedBy: string;
  changedByName?: string;
  notes?: string;
  createdAt: string;
}

export interface MaintenanceStatusChangeRow {
  id: string;
  issue_id: string;
  old_status: MaintenanceStatus | null;
  new_status: MaintenanceStatus;
  changed_by: string;
  notes: string | null;
  created_at: string;
}

export function transformMaintenanceStatusChange(row: MaintenanceStatusChangeRow): MaintenanceStatusChange {
  return {
    id: row.id,
    issueId: row.issue_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changedBy: row.changed_by,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

// ═══ Filter types ═══

export interface MaintenanceIssueFilters {
  status?: MaintenanceStatus[];
  category?: MaintenanceCategory[];
  urgency?: MaintenanceUrgency[];
  branchId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  slaBreached?: boolean;
}

// ═══ Dashboard stats ═══

export interface MaintenanceDashboardStats {
  total: number;
  byStatus: Record<MaintenanceStatus, number>;
  byUrgency: Record<MaintenanceUrgency, number>;
  slaBreachedCount: number;
  urgencyCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// ═══ SLA helpers ═══

export function isSlaBreached(issue: MaintenanceIssue): boolean {
  if (issue.status === 'resolved') return issue.slaBreached;
  if (!issue.slaDeadline) return false;
  return new Date() > new Date(issue.slaDeadline);
}

export function getSlaRemainingHours(issue: MaintenanceIssue): number | null {
  if (issue.status === 'resolved' || !issue.slaDeadline) return null;
  const deadline = new Date(issue.slaDeadline).getTime();
  const now = Date.now();
  return Math.round((deadline - now) / (1000 * 60 * 60));
}
