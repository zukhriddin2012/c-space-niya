'use client';

import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      {/* Desktop tabs */}
      <nav className="hidden sm:flex gap-1" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                group inline-flex items-center gap-2 px-4 py-3 text-sm font-medium
                border-b-2 transition-colors whitespace-nowrap
                ${isActive
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `.trim().replace(/\s+/g, ' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon && (
                <span className={`flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                  {tab.icon}
                </span>
              )}
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`
                  ml-1 px-2 py-0.5 rounded-full text-xs font-medium
                  ${isActive
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-600'
                  }
                `.trim().replace(/\s+/g, ' ')}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile dropdown */}
      <div className="sm:hidden">
        <select
          value={activeTab}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
              {tab.badge !== undefined ? ` (${tab.badge})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// TabPanel component for content
export interface TabPanelProps {
  children: React.ReactNode;
  tabId: string;
  activeTab: string;
  className?: string;
}

export function TabPanel({ children, tabId, activeTab, className = '' }: TabPanelProps) {
  if (tabId !== activeTab) return null;

  return (
    <div className={className} role="tabpanel">
      {children}
    </div>
  );
}
