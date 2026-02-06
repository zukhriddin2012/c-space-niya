/**
 * SEC-008: Password validation tests
 * Tests for password strength rules and validation
 */
import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  PASSWORD_MIN_LENGTH,
  type PasswordValidationResult,
} from '@/lib/password-validation';

describe('Password validation (SEC-008)', () => {
  describe('PASSWORD_MIN_LENGTH', () => {
    it('should be at least 10 characters', () => {
      expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(10);
    });
  });

  describe('validatePassword', () => {
    describe('strong passwords', () => {
      it('should accept a password meeting all rules', () => {
        const result = validatePassword('MyStr0ng!Pass');
        expect(result.isValid).toBe(true);
        expect(result.strength).toBe('strong');
        expect(result.rules.minLength).toBe(true);
        expect(result.rules.uppercase).toBe(true);
        expect(result.rules.lowercase).toBe(true);
        expect(result.rules.number).toBe(true);
        expect(result.rules.special).toBe(true);
      });

      it('should accept passwords with various special characters', () => {
        const specials = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '+', '='];
        for (const char of specials) {
          const pass = `Abcdefgh1${char}`;
          const result = validatePassword(pass);
          expect(result.rules.special).toBe(true);
        }
      });
    });

    describe('weak passwords', () => {
      it('should reject empty password', () => {
        const result = validatePassword('');
        expect(result.isValid).toBe(false);
        expect(result.strength).toBe('weak');
      });

      it('should reject password shorter than minimum length', () => {
        const result = validatePassword('Ab1!');
        expect(result.isValid).toBe(false);
        expect(result.rules.minLength).toBe(false);
      });

      it('should reject password with only lowercase', () => {
        const result = validatePassword('abcdefghijk');
        expect(result.isValid).toBe(false);
        expect(result.rules.uppercase).toBe(false);
        expect(result.rules.number).toBe(false);
        expect(result.rules.special).toBe(false);
      });

      it('should reject password with only uppercase', () => {
        const result = validatePassword('ABCDEFGHIJK');
        expect(result.isValid).toBe(false);
        expect(result.rules.lowercase).toBe(false);
      });

      it('should reject password without numbers', () => {
        const result = validatePassword('AbcDefGhi!@');
        expect(result.isValid).toBe(false);
        expect(result.rules.number).toBe(false);
      });

      it('should reject password without special characters', () => {
        const result = validatePassword('Abcdefgh123');
        expect(result.isValid).toBe(false);
        expect(result.rules.special).toBe(false);
      });
    });

    describe('strength levels', () => {
      it('should rate as "weak" when 0-2 rules pass', () => {
        // Only lowercase, no length
        const result = validatePassword('abc');
        expect(result.strength).toBe('weak');
      });

      it('should rate as "fair" when 3 rules pass', () => {
        // minLength + lowercase + uppercase (no number, no special)
        const result = validatePassword('Abcdefghijk');
        expect(result.strength).toBe('fair');
      });

      it('should rate as "good" when 4 rules pass', () => {
        // minLength + lowercase + uppercase + number (no special)
        const result = validatePassword('Abcdefghi12');
        expect(result.strength).toBe('good');
      });

      it('should rate as "strong" when all 5 rules pass', () => {
        const result = validatePassword('Abcdefgh1!x');
        expect(result.strength).toBe('strong');
      });
    });

    describe('edge cases', () => {
      it('should handle exact minimum length', () => {
        // Exactly 10 chars with all rules
        const result = validatePassword('Abcdefg1!x');
        expect(result.rules.minLength).toBe(true);
      });

      it('should reject at minimum length minus one', () => {
        const result = validatePassword('Abcdefg1!');
        expect(result.rules.minLength).toBe(false);
      });

      it('should handle very long passwords', () => {
        const longPass = 'A' + 'b'.repeat(100) + '1!';
        const result = validatePassword(longPass);
        expect(result.isValid).toBe(true);
      });

      it('should handle passwords with spaces', () => {
        const result = validatePassword('My Pass 1!x');
        // Spaces should count toward length
        expect(result.rules.minLength).toBe(true);
      });
    });

    describe('return structure', () => {
      it('should always return isValid, rules, and strength', () => {
        const result = validatePassword('test');
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('rules');
        expect(result).toHaveProperty('strength');
        expect(result.rules).toHaveProperty('minLength');
        expect(result.rules).toHaveProperty('uppercase');
        expect(result.rules).toHaveProperty('lowercase');
        expect(result.rules).toHaveProperty('number');
        expect(result.rules).toHaveProperty('special');
      });

      it('isValid should be true only when all rules pass', () => {
        const valid = validatePassword('MyStr0ng!Pass');
        expect(valid.isValid).toBe(true);
        expect(Object.values(valid.rules).every(Boolean)).toBe(true);

        const invalid = validatePassword('weakpass');
        expect(invalid.isValid).toBe(false);
        expect(Object.values(invalid.rules).every(Boolean)).toBe(false);
      });
    });
  });
});
