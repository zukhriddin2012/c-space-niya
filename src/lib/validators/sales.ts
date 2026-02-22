import { z } from 'zod';

// ============================================
// SHARED PRIMITIVES
// ============================================

const uuid = z.string().uuid('Must be a valid UUID');

const leadStage = z.enum(['new', 'contacted', 'tour_scheduled', 'proposal', 'won', 'lost']);

const leadPriority = z.enum(['hot', 'warm', 'medium', 'cold']);

const interestType = z.enum([
  'hot_desk', 'fixed_desk', 'private_office',
  'meeting_room', 'event_space', 'virtual_office', 'other',
]);

const budgetRange = z.enum([
  'under_1m', '1m_3m', '3m_5m', '5m_10m', 'above_10m', 'unknown',
]);

const leadActivityType = z.enum([
  'call_logged', 'walk_in_logged', 'note_added', 'stage_changed',
  'assigned', 'tour_completed', 'proposal_sent', 'follow_up_set',
  'email_sent', 'telegram_message', 'won', 'lost',
]);

const isoDatetime = z.string().regex(
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/,
  'Must be ISO datetime'
);

// ============================================
// CREATE LEAD (full form)
// ============================================

export const CreateLeadSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(255),
  source_id: z.string().min(1, 'Source is required').max(50),
  interest_type: interestType,
  branch_id: z.string().min(1, 'Branch is required'),
  phone: z.string().max(50).nullish(),
  email: z.string().email().max(255).nullish(),
  company_name: z.string().max(255).nullish(),
  industry: z.string().max(100).nullish(),
  position: z.string().max(100).nullish(),
  source_details: z.string().nullish(),
  team_size: z.number().int().positive().nullish(),
  budget_range: budgetRange.nullish(),
  priority: leadPriority.default('medium'),
  assigned_to: uuid.nullish(),
  next_follow_up_at: isoDatetime.nullish(),
  next_follow_up_note: z.string().nullish(),
  deal_value: z.number().int().nonnegative().nullish(),
  notes: z.string().nullish(),
}).strict();

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

// ============================================
// QUICK CAPTURE (minimal fields)
// ============================================

export const QuickCaptureSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(255),
  source_id: z.string().min(1, 'Source is required').max(50),
  branch_id: z.string().min(1, 'Branch is required'),
  phone: z.string().max(50).nullish(),
  company_name: z.string().max(255).nullish(),
  interest_type: interestType.default('other'),
  notes: z.string().nullish(),
  priority: leadPriority.default('medium'),
}).strict();

export type QuickCaptureInput = z.infer<typeof QuickCaptureSchema>;

// ============================================
// UPDATE LEAD (partial)
// ============================================

export const UpdateLeadSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).nullish(),
  email: z.string().email().max(255).nullish(),
  company_name: z.string().max(255).nullish(),
  industry: z.string().max(100).nullish(),
  position: z.string().max(100).nullish(),
  source_id: z.string().min(1).max(50).optional(),
  source_details: z.string().nullish(),
  interest_type: interestType.optional(),
  team_size: z.number().int().positive().nullish(),
  budget_range: budgetRange.nullish(),
  priority: leadPriority.optional(),
  next_follow_up_at: isoDatetime.nullish(),
  next_follow_up_note: z.string().nullish(),
  deal_value: z.number().int().nonnegative().nullish(),
  notes: z.string().nullish(),
  lost_reason: z.string().max(255).nullish(),
  client_id: uuid.nullish(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;

// ============================================
// STAGE CHANGE
// ============================================

export const StageChangeSchema = z.object({
  stage: leadStage,
  lost_reason: z.string().max(255).optional(),
}).strict().refine(
  (data) => {
    if (data.stage === 'lost' && !data.lost_reason) {
      return false;
    }
    return true;
  },
  { message: 'Lost reason is required when stage is "lost"', path: ['lost_reason'] }
);

export type StageChangeInput = z.infer<typeof StageChangeSchema>;

// ============================================
// ASSIGN LEAD
// ============================================

export const AssignLeadSchema = z.object({
  assigned_to: uuid,
}).strict();

export type AssignLeadInput = z.infer<typeof AssignLeadSchema>;

// ============================================
// CREATE ACTIVITY
// ============================================

export const CreateActivitySchema = z.object({
  activity_type: leadActivityType,
  description: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).strict();

export type CreateActivityInput = z.infer<typeof CreateActivitySchema>;

// ============================================
// QUERY PARAMS (GET /leads)
// ============================================

export const LeadQuerySchema = z.object({
  branchId: z.string().optional(),
  stage: leadStage.optional(),
  assignedTo: uuid.optional(),
  capturedBy: uuid.optional(),
  priority: leadPriority.optional(),
  sourceId: z.string().optional(),
  isArchived: z.enum(['true', 'false']).optional(),
});

export type LeadQueryInput = z.infer<typeof LeadQuerySchema>;
