'use client';

import { CheckCircle, Circle } from 'lucide-react';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/password-validation';

interface PasswordStrengthProps {
  password: string;
}

const strengthColors = {
  weak: { bar: 'bg-red-500', text: 'text-red-600' },
  fair: { bar: 'bg-amber-500', text: 'text-amber-600' },
  good: { bar: 'bg-blue-500', text: 'text-blue-600' },
  strong: { bar: 'bg-emerald-500', text: 'text-emerald-600' },
};

const strengthLabels = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

const strengthSegments = {
  weak: 1,
  fair: 2,
  good: 3,
  strong: 4,
};

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const { rules, strength } = validatePassword(password);
  const colors = strengthColors[strength];
  const segments = strengthSegments[strength];

  const ruleList = [
    { key: 'minLength', label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: rules.minLength },
    { key: 'uppercase', label: 'Uppercase letter (A-Z)', met: rules.uppercase },
    { key: 'lowercase', label: 'Lowercase letter (a-z)', met: rules.lowercase },
    { key: 'number', label: 'Number (0-9)', met: rules.number },
    { key: 'special', label: 'Special character (!@#$...)', met: rules.special },
  ];

  return (
    <div className="mt-2 space-y-3">
      {/* Strength bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Password strength</span>
          <span className={`text-xs font-medium ${colors.text}`}>
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((seg) => (
            <div
              key={seg}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                seg <= segments ? colors.bar : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Rule checklist */}
      <ul className="space-y-1.5" role="list" aria-label="Password requirements">
        {ruleList.map((rule) => (
          <li key={rule.key} className="flex items-center gap-2 text-sm">
            {rule.met ? (
              <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle size={16} className="text-gray-300 flex-shrink-0" />
            )}
            <span className={rule.met ? 'text-emerald-700' : 'text-gray-500'}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
