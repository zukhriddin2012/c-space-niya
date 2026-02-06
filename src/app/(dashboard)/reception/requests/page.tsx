'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Scale, Wrench, Calendar, Calculator } from 'lucide-react';
import Card from '@/components/ui/Card';

interface RequestHubCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  bgColor: string;
  count: number;
  isLoading: boolean;
}

export default function RequestsHubPage() {
  const [cards, setCards] = useState<RequestHubCard[]>([
    {
      id: 'accounting',
      title: 'Accounting Requests',
      description: 'Reconciliations, payments, confirmations',
      icon: <Calculator className="w-6 h-6" />,
      href: '/reception/requests/accounting',
      bgColor: 'bg-purple-100 text-purple-700',
      count: 0,
      isLoading: true,
    },
    {
      id: 'legal',
      title: 'Legal Requests',
      description: 'Contracts, agreements, registrations',
      icon: <Scale className="w-6 h-6" />,
      href: '/reception/requests/legal',
      bgColor: 'bg-indigo-100 text-indigo-700',
      count: 0,
      isLoading: true,
    },
    {
      id: 'maintenance',
      title: 'Maintenance Issues',
      description: 'Repairs, maintenance requests',
      icon: <Wrench className="w-6 h-6" />,
      href: '/reception/requests/maintenance',
      bgColor: 'bg-orange-100 text-orange-700',
      count: 0,
      isLoading: true,
    },
    {
      id: 'shifts',
      title: 'Shifts Schedule',
      description: 'Employee shift assignments',
      icon: <Calendar className="w-6 h-6" />,
      href: '/reception/shifts',
      bgColor: 'bg-blue-100 text-blue-700',
      count: 0,
      isLoading: true,
    },
  ]);

  // Fetch counts from APIs
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch accounting requests count
        const accountingRes = await fetch('/api/reception/accounting-requests?limit=1');
        const accountingData = accountingRes.ok ? await accountingRes.json() : { count: 0 };

        // Fetch legal requests count
        const legalRes = await fetch('/api/reception/legal-requests?limit=1');
        const legalData = legalRes.ok ? await legalRes.json() : { count: 0 };

        // Fetch maintenance count (if endpoint exists)
        let maintenanceCount = 0;
        try {
          const maintenanceRes = await fetch('/api/reception/maintenance-issues?limit=1');
          const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : { count: 0 };
          maintenanceCount = maintenanceData.count || 0;
        } catch {
          // Maintenance endpoint might not exist yet
        }

        // Fetch shifts count
        let shiftsCount = 0;
        try {
          const shiftsRes = await fetch('/api/reception/shifts?limit=1');
          const shiftsData = shiftsRes.ok ? await shiftsRes.json() : { count: 0 };
          shiftsCount = shiftsData.count || 0;
        } catch {
          // Shifts endpoint might not exist yet
        }

        setCards(prevCards =>
          prevCards.map(card => ({
            ...card,
            count:
              card.id === 'accounting'
                ? accountingData.count || 0
                : card.id === 'legal'
                  ? legalData.count || 0
                  : card.id === 'maintenance'
                    ? maintenanceCount
                    : card.id === 'shifts'
                      ? shiftsCount
                      : 0,
            isLoading: false,
          }))
        );
      } catch (error) {
        console.error('Failed to fetch request counts:', error);
        setCards(prevCards =>
          prevCards.map(card => ({
            ...card,
            isLoading: false,
          }))
        );
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Requests Hub</h1>
        <p className="text-gray-500 mt-2">
          Access all request management systems
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map(card => (
          <Link key={card.id} href={card.href}>
            <Card className="h-full hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                {/* Left section: icon and text */}
                <div className="flex-1">
                  <div className={`w-12 h-12 rounded-full ${card.bgColor} flex items-center justify-center mb-4`}>
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {card.description}
                  </p>
                </div>

                {/* Right section: count badge */}
                <div className="ml-4 flex-shrink-0">
                  {card.isLoading ? (
                    <div className="w-12 h-12 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {card.count}
                      </div>
                      <p className="text-xs text-gray-400">
                        {card.count === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
