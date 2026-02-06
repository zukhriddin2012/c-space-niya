'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, Eye, EyeOff, Shield, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { validatePassword } from '@/lib/password-validation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-redirect after success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError(t.auth.meetPasswordRequirements);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(data.message || t.auth.failedToUpdatePassword);
      }
    } catch {
      setError(t.auth.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.auth.passwordUpdated}</h2>
          <p className="text-gray-600 mb-6">
            {t.auth.passwordUpdatedMessage}
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">{t.auth.redirectingToDashboard}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Security banner */}
        <div className="bg-purple-600 text-white px-4 py-3 rounded-t-xl flex items-center gap-2">
          <Shield size={20} />
          <span className="font-medium">{t.auth.securityUpdateRequired}</span>
        </div>

        <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/logo-icon.svg"
              alt="C-Space Logo"
              width={48}
              height={54}
              className="mb-3"
            />
            <h1 className="text-lg font-semibold text-gray-900">C-Space Niya</h1>
            <p className="text-gray-500 text-sm">{t.auth.platformSubtitle}</p>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              {t.auth.securityUpdateMessage}
            </p>
          </div>

          {/* Form */}
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t.auth.setNewPassword}</h2>
          <p className="text-sm text-gray-500 mb-5">
            {t.auth.setNewPasswordDesc}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.auth.newPassword}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.auth.enterNewPasswordPlaceholder}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.auth.confirmPassword}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.auth.confirmNewPasswordPlaceholder}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1.5 text-sm text-red-600">{t.auth.passwordsDoNotMatch}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !validatePassword(newPassword).isValid || newPassword !== confirmPassword}
              className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {t.auth.updatingPassword}
                </>
              ) : (
                t.auth.updatePasswordButton
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            {t.auth.needHelp}
          </p>
        </div>
      </div>
    </div>
  );
}
