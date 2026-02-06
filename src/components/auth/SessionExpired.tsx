'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SessionExpiredProps {
  isOpen: boolean;
}

export default function SessionExpired({ isOpen }: SessionExpiredProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSignIn = () => {
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
        {/* Icon */}
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogOut size={28} className="text-red-600" />
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-2">Session Expired</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your session has expired for security reasons. Please sign in again to continue.
        </p>

        {/* Info badge */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg py-2 px-3 mb-6">
          <p className="text-xs text-blue-700">
            Don&apos;t worry — your unsaved work may be recoverable.
          </p>
        </div>

        {/* Button */}
        <button
          onClick={handleSignIn}
          className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          Sign In Again
        </button>
      </div>
    </div>
  );
}
