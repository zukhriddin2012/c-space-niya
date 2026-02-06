// ============================================
// TST-025: Legal Metadata Validators Tests
// Tests for src/modules/legal/validators.ts
// Covers: C-04 (Zod strict validation of JSONB metadata)
// ============================================

import { describe, it, expect } from 'vitest';
import {
  validateLegalMetadata,
  ContractPreparationSchema,
  SupplementaryAgreementSchema,
  ContractTerminationSchema,
  WebsiteRegistrationSchema,
  GuaranteeLetterSchema,
} from '@/modules/legal/validators';

// ═══ Test Fixtures ═══

const validContractPreparation = {
  contractType: 'А',
  paymentForm: 'wire',
  serviceCost: 50000,
  paymentPeriod: 'monthly',
  startDate: '2026-03-01',
  endDate: '2027-02-28',
  registrationRequired: false,
};

const validSupplementaryAgreement = {
  changeType: 'discount',
  changeDescription: 'Reduce monthly rate by 10%',
  effectiveDate: '2026-04-01',
};

const validContractTermination = {
  terminationDate: '2026-06-30',
  hasDebt: false,
};

const validWebsiteRegistration = {
  companyName: 'Test Company LLC',
  inn: '1234567890',
  branchName: 'Niya Branch',
  registrationPeriod: '12 months',
  phone: '+998901234567',
  monthlyAmount: 3000000,
  paymentStatus: 'paid',
  contractNumber: 'CNT-2026-001',
};

const validGuaranteeLetter = {
  futureCompanyName: 'New Ventures LLC',
  directorFullName: 'Abdullaev Rustam Sharipovich',
  requiredAreaSqm: 120,
};

// ═══ validateLegalMetadata (discriminated union) ═══

describe('validateLegalMetadata', () => {
  describe('routes to correct schema by request type', () => {
    it('validates contract_preparation metadata', () => {
      const result = validateLegalMetadata('contract_preparation', validContractPreparation);
      expect(result.success).toBe(true);
    });

    it('validates supplementary_agreement metadata', () => {
      const result = validateLegalMetadata('supplementary_agreement', validSupplementaryAgreement);
      expect(result.success).toBe(true);
    });

    it('validates contract_termination metadata', () => {
      const result = validateLegalMetadata('contract_termination', validContractTermination);
      expect(result.success).toBe(true);
    });

    it('validates website_registration metadata', () => {
      const result = validateLegalMetadata('website_registration', validWebsiteRegistration);
      expect(result.success).toBe(true);
    });

    it('validates guarantee_letter metadata', () => {
      const result = validateLegalMetadata('guarantee_letter', validGuaranteeLetter);
      expect(result.success).toBe(true);
    });
  });

  describe('rejects unknown request type', () => {
    it('returns error for invalid type', () => {
      const result = validateLegalMetadata('invalid_type' as any, {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('Unknown request type');
      }
    });
  });

  describe('BUG-06 fix: error messages use field path or "metadata" for root-level errors', () => {
    it('includes field name in validation errors', () => {
      const result = validateLegalMetadata('contract_preparation', {
        ...validContractPreparation,
        serviceCost: 'not_a_number',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.startsWith('serviceCost:'))).toBe(true);
      }
    });

    it('does not produce empty field prefix for root-level errors', () => {
      const result = validateLegalMetadata('contract_preparation', 'not_an_object');
      expect(result.success).toBe(false);
      if (!result.success) {
        // Should not start with ": " (empty path bug)
        for (const err of result.errors) {
          expect(err).not.toMatch(/^: /);
        }
      }
    });
  });
});

// ═══ ContractPreparationSchema ═══

describe('ContractPreparationSchema', () => {
  it('accepts valid data', () => {
    expect(ContractPreparationSchema.safeParse(validContractPreparation).success).toBe(true);
  });

  it('accepts data with optional fields', () => {
    const result = ContractPreparationSchema.safeParse({
      ...validContractPreparation,
      areaSqm: 150,
      officeNumber: 'A-205',
      workstations: 10,
      tariff: 'Premium',
      additionalConditions: 'Parking included',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid contractType', () => {
    const result = ContractPreparationSchema.safeParse({
      ...validContractPreparation,
      contractType: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative serviceCost', () => {
    const result = ContractPreparationSchema.safeParse({
      ...validContractPreparation,
      serviceCost: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects serviceCost exceeding 1 trillion', () => {
    const result = ContractPreparationSchema.safeParse({
      ...validContractPreparation,
      serviceCost: 1e13,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = ContractPreparationSchema.safeParse({
      ...validContractPreparation,
      startDate: '2026/03/01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (.strict() mode)', () => {
    const result = ContractPreparationSchema.safeParse({
      ...validContractPreparation,
      maliciousField: '<script>alert("xss")</script>',
    });
    expect(result.success).toBe(false);
  });
});

// ═══ SupplementaryAgreementSchema ═══

describe('SupplementaryAgreementSchema', () => {
  it('accepts valid data', () => {
    expect(SupplementaryAgreementSchema.safeParse(validSupplementaryAgreement).success).toBe(true);
  });

  it('rejects empty changeDescription', () => {
    const result = SupplementaryAgreementSchema.safeParse({
      ...validSupplementaryAgreement,
      changeDescription: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (.strict())', () => {
    const result = SupplementaryAgreementSchema.safeParse({
      ...validSupplementaryAgreement,
      extra: 'should_fail',
    });
    expect(result.success).toBe(false);
  });
});

// ═══ ContractTerminationSchema ═══

describe('ContractTerminationSchema', () => {
  it('accepts valid data without debt', () => {
    expect(ContractTerminationSchema.safeParse(validContractTermination).success).toBe(true);
  });

  it('accepts valid data with debt amount', () => {
    const result = ContractTerminationSchema.safeParse({
      terminationDate: '2026-06-30',
      hasDebt: true,
      debtAmount: 500000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects hasDebt=true without debtAmount (custom refinement)', () => {
    const result = ContractTerminationSchema.safeParse({
      terminationDate: '2026-06-30',
      hasDebt: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative debtAmount', () => {
    const result = ContractTerminationSchema.safeParse({
      terminationDate: '2026-06-30',
      hasDebt: true,
      debtAmount: -100,
    });
    expect(result.success).toBe(false);
  });
});

// ═══ WebsiteRegistrationSchema ═══

describe('WebsiteRegistrationSchema', () => {
  it('accepts valid data', () => {
    expect(WebsiteRegistrationSchema.safeParse(validWebsiteRegistration).success).toBe(true);
  });

  it('rejects invalid paymentStatus enum', () => {
    const result = WebsiteRegistrationSchema.safeParse({
      ...validWebsiteRegistration,
      paymentStatus: 'overdue',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required inn', () => {
    const { inn, ...noInn } = validWebsiteRegistration;
    const result = WebsiteRegistrationSchema.safeParse(noInn);
    expect(result.success).toBe(false);
  });
});

// ═══ GuaranteeLetterSchema ═══

describe('GuaranteeLetterSchema', () => {
  it('accepts valid data', () => {
    expect(GuaranteeLetterSchema.safeParse(validGuaranteeLetter).success).toBe(true);
  });

  it('accepts with optional additionalDetails', () => {
    const result = GuaranteeLetterSchema.safeParse({
      ...validGuaranteeLetter,
      additionalDetails: 'Need specific floor',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero area', () => {
    const result = GuaranteeLetterSchema.safeParse({
      ...validGuaranteeLetter,
      requiredAreaSqm: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects area exceeding max', () => {
    const result = GuaranteeLetterSchema.safeParse({
      ...validGuaranteeLetter,
      requiredAreaSqm: 100_001,
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (.strict())', () => {
    const result = GuaranteeLetterSchema.safeParse({
      ...validGuaranteeLetter,
      __proto__: { admin: true },
      extraField: 'injection',
    });
    expect(result.success).toBe(false);
  });
});
