import { z } from 'zod';

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Must be a valid UUID'
);

const isoDatetime = z.string().regex(
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/,
  'Must be ISO datetime'
);

const assignmentType = z.enum(['temporary', 'regular', 'permanent_transfer']);

// ── AT-1: Create Assignment ──
export const CreateAssignmentSchema = z.object({
  employeeId: uuid,
  assignedBranchId: z.string().min(1, 'Branch ID is required'),
  assignmentType: assignmentType.default('temporary'),
  startsAt: isoDatetime.optional(),
  endsAt: isoDatetime.nullish(),
  notes: z.string().max(500).nullish(),
}).strict().refine(
  (data) => {
    if (data.endsAt && data.startsAt) {
      return new Date(data.endsAt) > new Date(data.startsAt);
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['endsAt'] }
);

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;

// ── AT-1: Update Assignment ──
export const UpdateAssignmentSchema = z.object({
  endsAt: isoDatetime.nullish(),
  assignmentType: assignmentType.optional(),
  notes: z.string().max(500).nullish(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>;

// ── AT-1: Bulk Create ──
export const BulkCreateAssignmentSchema = z.object({
  employeeIds: z.array(uuid).min(1, 'At least one employee').max(20, 'Maximum 20 employees'),
  assignedBranchId: z.string().min(1, 'Branch ID is required'),
  assignmentType: assignmentType.default('temporary'),
  startsAt: isoDatetime.optional(),
  endsAt: isoDatetime.nullish(),
  notes: z.string().max(500).nullish(),
}).strict();

export type BulkCreateAssignmentInput = z.infer<typeof BulkCreateAssignmentSchema>;

// ── Query parameter schemas ──
export const AssignmentQuerySchema = z.object({
  branchId: z.string().optional(),
  employeeId: uuid.optional(),
  type: assignmentType.optional(),
  includeExpired: z.enum(['true', 'false']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
}).refine(
  (data) => data.branchId || data.employeeId,
  { message: 'Either branchId or employeeId must be provided' }
);

export type AssignmentQueryInput = z.infer<typeof AssignmentQuerySchema>;
