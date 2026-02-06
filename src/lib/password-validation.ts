// SEC-008: Password validation rules (shared between client and server)
export interface PasswordValidationResult {
  isValid: boolean;
  rules: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

export const PASSWORD_MIN_LENGTH = 10;

export function validatePassword(password: string): PasswordValidationResult {
  const rules = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const passed = Object.values(rules).filter(Boolean).length;
  const isValid = Object.values(rules).every(Boolean);

  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (passed >= 5) strength = 'strong';
  else if (passed >= 4) strength = 'good';
  else if (passed >= 3) strength = 'fair';

  return { isValid, rules, strength };
}
