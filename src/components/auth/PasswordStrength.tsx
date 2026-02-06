'use client';

import { CheckCircle, Circle } from 'lucide-react';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/password-validation';
import { useLanguage } from '@/contexts/LanguageContext';

interface PasswordStrengthProps {
  password: string;
}

const strengthColors = {
  weak: { bar: 'bg-red-500', text: 'text-red-600' },
  fair: { bar: 'bg-amber-500', text: 'text-amber-600' },
  good: { bar: 'bg-blue-500', text: 'text-blue-600' },
  strong: { bar: 'bg-emerald-500', text: 'text-emerald-600' },
};

const getStrengthLabels = (t: ReturnType<typeof useLanguage>['t']) => ({
  weak: t.auth.passwordWeak,
  fair: t.auth.passwordFair,
  good: t.auth.passwordGood,
  strong: t.auth.passwordStrong,
});

const strengthSegments = {
  weak: 1,
  fair: 2,
  good: 3,
  strong: 4,
};

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useLanguage();

  if (!password) return null;

  const { rules, strength } = validatePassword(password);
  const colors = strengthColors[strength];
  const segments = strengthSegments[strength];
  const strengthLabels = getStrengthLabels(t);

  const ruleList = [
    { key: 'minLength', label: t.auth.passwordAtLeastChars.replace('{n}', String(PASSWORD_MIN_LENGTH)), met: rules.minLength },
    { key: 'uppercase', label: t.auth.passwordUppercase, met: rules.uppercase },
    { key: 'lowercase', label: t.auth.passwordLowercase, met: rules.lowercase },
    { key: 'number', label: t.auth.passwordNumber, met: rules.number },
    { key: 'special', label: t.auth.passwordSpecialChar, met: rules.special },
  ];

  return (
    <div className="mt-2 space-y-3">
      {/* Strength bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">{t.auth.passwordStrength}</span>
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
