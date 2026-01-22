'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LayoutList, Building2 } from 'lucide-react';

interface ViewToggleProps {
  currentView: 'table' | 'branch';
}

export default function ViewToggle({ currentView }: ViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleViewChange = (view: 'table' | 'branch') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleViewChange('branch')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all
          ${currentView === 'branch'
            ? 'bg-white shadow-sm text-gray-900'
            : 'text-gray-500 hover:text-gray-700'
          }`}
      >
        <Building2 size={16} />
        By Branch
      </button>
      <button
        onClick={() => handleViewChange('table')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all
          ${currentView === 'table'
            ? 'bg-white shadow-sm text-gray-900'
            : 'text-gray-500 hover:text-gray-700'
          }`}
      >
        <LayoutList size={16} />
        Table
      </button>
    </div>
  );
}
