// ============================================
// METRONOME SYNC — Zod Validation Schemas
// SEC-C4: Strict input validation for all metronome API routes
// ============================================

import { z } from 'zod';

// ═══ Shared primitives ═══

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Must be a valid UUID'
);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const isoDatetime = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  'Must be an ISO datetime'
);

const functionTag = z.enum([
  'bd', 'construction', 'hr', 'finance', 'legal', 'strategy', 'service',
] as const);

const priority = z.enum(['critical', 'high', 'strategic', 'resolved'] as const);

const actionStatus = z.enum(['pending', 'in_progress', 'done', 'blocked'] as const);

const keyDateCategory = z.enum([
  'critical', 'high', 'meeting', 'strategic', 'event', 'holiday',
] as const);

// ═══ INITIATIVES ═══

export const CreateInitiativeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(5000).nullish(),
  function_tag: functionTag,
  priority: priority,
  accountable_ids: z.array(uuid).max(20).default([]),
  owner_label: z.string().max(255).nullish(),
  status_label: z.string().max(255).nullish(),
  deadline: isoDate.nullish(),
  deadline_label: z.string().max(100).nullish(),
}).strict();

export const UpdateInitiativeSchema = z.object({
  action: z.literal('update'),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullish(),
  function_tag: functionTag.optional(),
  priority: priority.optional(),
  accountable_ids: z.array(uuid).max(20).optional(),
  owner_label: z.string().max(255).nullish(),
  status_label: z.string().max(255).nullish(),
  deadline: isoDate.nullish(),
  deadline_label: z.string().max(100).nullish(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const ArchiveInitiativeSchema = z.object({
  action: z.enum(['archive', 'restore']),
});

// ═══ ACTION ITEMS ═══

export const CreateActionItemSchema = z.object({
  initiative_id: uuid,
  title: z.string().min(1, 'Title is required').max(500),
  assigned_to: uuid.nullish(),
  deadline: isoDate.nullish(),
  status: actionStatus.default('pending'),
}).strict();

export const ToggleActionItemSchema = z.object({
  action: z.literal('toggle'),
  id: uuid,
});

export const UpdateActionItemSchema = z.object({
  action: z.literal('update'),
  id: uuid,
  title: z.string().min(1).max(500).optional(),
  status: actionStatus.optional(),
  assigned_to: uuid.nullish(),
  deadline: isoDate.nullish(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const ReorderActionItemsSchema = z.object({
  action: z.literal('reorder'),
  items: z.array(z.object({
    id: uuid,
    sort_order: z.number().int().min(0).max(9999),
  })).min(1).max(100),
});

// ═══ DECISIONS ═══

export const CreateDecisionSchema = z.object({
  question: z.string().min(1, 'Question is required').max(2000),
  initiative_id: uuid.nullish(),
  function_tag: functionTag.nullish(),
  deadline: isoDate.nullish(),
}).strict();

export const DecideSchema = z.object({
  action: z.literal('decide'),
  id: uuid,
  decision_text: z.string().min(1, 'Decision text is required').max(5000),
});

export const DeferSchema = z.object({
  action: z.literal('defer'),
  id: uuid,
});

export const UpdateDecisionSchema = z.object({
  action: z.literal('update'),
  id: uuid,
  question: z.string().min(1).max(2000).optional(),
  deadline: isoDate.nullish(),
  function_tag: functionTag.nullish(),
  initiative_id: uuid.nullish(),
});

// ═══ KEY DATES ═══

export const CreateKeyDateSchema = z.object({
  date: isoDate,
  title: z.string().min(1, 'Title is required').max(255),
  emoji: z.string().max(10).nullish(),
  category: keyDateCategory.default('event'),
  initiative_id: uuid.nullish(),
  is_recurring: z.boolean().default(false),
}).strict();

export const DeleteKeyDateSchema = z.object({
  id: uuid,
}).strict();

// ═══ SYNCS ═══

const focusAreaEntry = z.object({
  person: z.string().min(1).max(255),
  items: z.array(z.string().max(500)).max(20),
});

export const CreateSyncSchema = z.object({
  sync_date: isoDate,
  title: z.string().max(255).nullish(),
  notes: z.string().max(10000).nullish(),
  attendee_ids: z.array(uuid).max(50).default([]),
  started_at: isoDatetime.nullish(),
  ended_at: isoDatetime.nullish(),
  duration_seconds: z.number().int().min(0).max(86400).nullish(),
  next_sync_date: isoDate.nullish(),
  next_sync_focus: z.string().max(2000).nullish(),
  focus_areas: z.array(focusAreaEntry).max(20).default([]),
  items_discussed: z.number().int().min(0).max(9999).default(0),
  decisions_made: z.number().int().min(0).max(9999).default(0),
  action_items_completed: z.number().int().min(0).max(9999).default(0),
}).strict();
