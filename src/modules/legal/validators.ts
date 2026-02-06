// ============================================
// LEGAL MODULE — Zod Validation Schemas
// C-04: Strict metadata validation for all 5 legal request types
// ============================================

import { z } from 'zod';
import { MAX_LENGTH } from '@/lib/security';

// ═══ Shared date regex ═══
const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date (YYYY-MM-DD)');

// ═══ Contract Preparation (R3.1) ═══

export const ContractPreparationSchema = z.object({
  contractType: z.enum(['А', 'ОА', 'EI', 'C', 'E', 'N'] as const),
  paymentForm: z.enum(['wire', 'cash', 'usd'] as const),
  serviceCost: z.number().positive('Service cost must be positive').max(1e12, 'Service cost is too large'),
  paymentPeriod: z.enum(['monthly', 'quarterly', 'prepaid', 'one_time'] as const),
  startDate: isoDateString,
  endDate: isoDateString,
  areaSqm: z.number().positive().max(100_000).optional(),
  officeNumber: z.string().max(50).optional(),
  workstations: z.number().int().positive().max(10_000).optional(),
  tariff: z.string().max(200).optional(),
  registrationRequired: z.boolean(),
  additionalConditions: z.string().max(MAX_LENGTH.ADDITIONAL_CONDITIONS).optional(),
}).strict();

// ═══ Supplementary Agreement (R3.2) ═══

export const SupplementaryAgreementSchema = z.object({
  changeType: z.enum(['discount', 'area', 'office', 'payment_format', 'other'] as const),
  changeDescription: z.string().min(1, 'Change description is required').max(MAX_LENGTH.CHANGE_DESCRIPTION),
  effectiveDate: isoDateString,
}).strict();

// ═══ Contract Termination (R3.3) ═══

export const ContractTerminationSchema = z.object({
  terminationDate: isoDateString,
  hasDebt: z.boolean(),
  debtAmount: z.number().nonnegative().max(1e12).optional(),
  terminationReason: z.string().max(MAX_LENGTH.NOTES).optional(),
}).strict().refine(
  (data) => {
    // If hasDebt is true, debtAmount is required
    if (data.hasDebt && (data.debtAmount === undefined || data.debtAmount === null)) {
      return false;
    }
    return true;
  },
  { message: 'debtAmount is required when hasDebt is true', path: ['debtAmount'] }
);

// ═══ Website Registration (R3.4) ═══

export const WebsiteRegistrationSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(MAX_LENGTH.COMPANY_NAME),
  inn: z.string().min(1, 'INN is required').max(MAX_LENGTH.INN),
  branchName: z.string().min(1, 'Branch name is required').max(MAX_LENGTH.COMPANY_NAME),
  registrationPeriod: z.string().min(1, 'Registration period is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(MAX_LENGTH.PHONE),
  monthlyAmount: z.number().positive('Monthly amount must be positive').max(1e12),
  paymentStatus: z.enum(['paid', 'unpaid', 'partial'] as const),
  contractNumber: z.string().min(1, 'Contract number is required').max(MAX_LENGTH.CONTRACT_NUMBER),
}).strict();

// ═══ Guarantee Letter (R3.5) ═══

export const GuaranteeLetterSchema = z.object({
  futureCompanyName: z.string().min(1, 'Future company name is required').max(MAX_LENGTH.COMPANY_NAME),
  directorFullName: z.string().min(1, 'Director full name is required').max(MAX_LENGTH.PERSON_NAME),
  requiredAreaSqm: z.number().positive('Required area must be positive').max(100_000),
  additionalDetails: z.string().max(MAX_LENGTH.ADDITIONAL_CONDITIONS).optional(),
}).strict();

// ═══ Discriminated validator by request type ═══

export type LegalRequestTypeValue =
  | 'contract_preparation'
  | 'supplementary_agreement'
  | 'contract_termination'
  | 'website_registration'
  | 'guarantee_letter';

const METADATA_SCHEMAS: Record<LegalRequestTypeValue, z.ZodSchema> = {
  contract_preparation: ContractPreparationSchema,
  supplementary_agreement: SupplementaryAgreementSchema,
  contract_termination: ContractTerminationSchema,
  website_registration: WebsiteRegistrationSchema,
  guarantee_letter: GuaranteeLetterSchema,
};

/**
 * Validate metadata against the correct schema based on request type.
 * Returns { success: true, data } or { success: false, errors }.
 */
export function validateLegalMetadata(
  requestType: LegalRequestTypeValue,
  metadata: unknown
): { success: true; data: Record<string, unknown> } | { success: false; errors: string[] } {
  const schema = METADATA_SCHEMAS[requestType];

  if (!schema) {
    return { success: false, errors: [`Unknown request type: ${requestType}`] };
  }

  const result = schema.safeParse(metadata);

  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }

  const errors = result.error.issues.map(
    (issue) => {
      const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'metadata';
      return `${fieldPath}: ${issue.message}`;
    }
  );

  return { success: false, errors };
}
