'use client';

import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';

export default function SidebarToggle() {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
    </button>
  );
}
