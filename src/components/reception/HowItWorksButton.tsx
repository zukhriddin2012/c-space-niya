'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import OnboardingModal from './OnboardingModal';

interface HowItWorksButtonProps {
  moduleKey: string;
  className?: string;
}

export default function HowItWorksButton({ moduleKey, className = '' }: HowItWorksButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ${className}`}
        style={{
          animation: 'onboard-pulse 2.5s ease-in-out infinite',
        }}
      >
        <HelpCircle className="w-4 h-4" />
        <span>How it works?</span>

        <style jsx>{`
          @keyframes onboard-pulse {
            0%, 100% { box-shadow: 0 4px 12px rgba(124,58,237,.3); }
            50% { box-shadow: 0 4px 24px rgba(124,58,237,.5); }
          }
        `}</style>
      </button>

      <OnboardingModal
        moduleKey={moduleKey}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
