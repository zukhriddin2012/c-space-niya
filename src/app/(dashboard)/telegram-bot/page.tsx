'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  BookOpen,
  MessageSquare,
  MousePointerClick,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Lightbulb,
  Users,
  Star,
  Target,
  RefreshCw,
  LayoutDashboard,
  Bell,
  Shield,
  Clock,
  ArrowDown,
  Send,
  Download,
  RotateCcw,
} from 'lucide-react';
import { PageGuard } from '@/components/RoleGuard';
import { PERMISSIONS } from '@/lib/permissions';
import type {
  BotLearningContent,
  BotMessageTemplate,
  BotButtonLabel,
  BotSettings,
  LocalizedContent,
  SupportedLanguage,
} from '@/lib/supabase';

type TabId = 'dashboard' | 'reminders' | 'learning' | 'messages' | 'buttons' | 'settings';

const LANGUAGES: { code: SupportedLanguage; flag: string; name: string }[] = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'uz', flag: '🇺🇿', name: 'O\'zbek' },
];

const CONTENT_TYPES = [
  { value: 'tip', label: 'Tip', emoji: '💡', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'scenario', label: 'Scenario', emoji: '🎭', color: 'bg-blue-100 text-blue-700' },
  { value: 'quiz', label: 'Quiz', emoji: '🎯', color: 'bg-green-100 text-green-700' },
  { value: 'reflection', label: 'Reflection', emoji: '⭐', color: 'bg-purple-100 text-purple-700' },
];

const CATEGORIES = [
  { value: 'service_excellence', label: 'Service Excellence', icon: Star },
  { value: 'team_collaboration', label: 'Team Collaboration', icon: Users },
  { value: 'customer_handling', label: 'Customer Handling', icon: MessageSquare },
  { value: 'company_values', label: 'Company Values', icon: Target },
  { value: 'professional_growth', label: 'Professional Growth', icon: Lightbulb },
];

interface ReminderStats {
  totalReminders: number;
  dayShiftReminders: number;
  nightShiftReminders: number;
  responseRate: number;
  responseRateChange: number;
  verificationRate: number;
  verifiedCount: number;
  completedCount: number;
  pendingReminders: number;
}

interface ReminderItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  telegramId: string;
  shiftType: 'day' | 'night';
  status: string;
  responseType: string | null;
  ipVerified: boolean;
  ipAddress: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  attendance: {
    id: string;
    checkIn: string;
    checkOut: string | null;
    date: string;
  } | null;
}

export default function TelegramBotPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [learningContent, setLearningContent] = useState<BotLearningContent[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<BotMessageTemplate[]>([]);
  const [buttonLabels, setButtonLabels] = useState<BotButtonLabel[]>([]);
  const [botSettings, setBotSettings] = useState<BotSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard state
  const [reminderStats, setReminderStats] = useState<ReminderStats | null>(null);
  const [recentReminders, setRecentReminders] = useState<ReminderItem[]>([]);

  // Reminders tab state
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderStatusFilter, setReminderStatusFilter] = useState('all');
  const [reminderShiftFilter, setReminderShiftFilter] = useState('all');

  // Modal states
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [editingContent, setEditingContent] = useState<BotLearningContent | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<BotMessageTemplate | null>(null);
  const [editingButton, setEditingButton] = useState<BotButtonLabel | null>(null);

  // Filters
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');

  useEffect(() => {
    fetchData();
  }, [activeTab, reminderDate, reminderStatusFilter, reminderShiftFilter]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'dashboard') {
        // Fetch stats and recent reminders
        const [statsRes, remindersRes] = await Promise.all([
          fetch('/api/telegram-bot/reminder-stats'),
          fetch('/api/telegram-bot/reminders?limit=5'),
        ]);
        const statsData = await statsRes.json();
        const remindersData = await remindersRes.json();
        if (statsRes.ok) setReminderStats(statsData.stats);
        if (remindersRes.ok) setRecentReminders(remindersData.reminders || []);
      } else if (activeTab === 'reminders') {
        const params = new URLSearchParams({
          date: reminderDate,
          status: reminderStatusFilter,
          shift: reminderShiftFilter,
          limit: '50',
        });
        const res = await fetch(`/api/telegram-bot/reminders?${params}`);
        const data = await res.json();
        if (res.ok) setReminders(data.reminders || []);
        else setError(data.error);
      } else if (activeTab === 'learning') {
        const res = await fetch('/api/telegram-bot/learning-content');
        const data = await res.json();
        if (res.ok) setLearningContent(data.content || []);
        else setError(data.error);
      } else if (activeTab === 'messages') {
        const res = await fetch('/api/telegram-bot/message-templates');
        const data = await res.json();
        if (res.ok) setMessageTemplates(data.templates || []);
        else setError(data.error);
      } else if (activeTab === 'buttons') {
        const res = await fetch('/api/telegram-bot/button-labels');
        const data = await res.json();
        if (res.ok) setButtonLabels(data.labels || []);
        else setError(data.error);
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/telegram-bot/settings');
        const data = await res.json();
        if (res.ok) setBotSettings(data.settings || []);
        else setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    try {
      const res = await fetch(`/api/telegram-bot/learning-content?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLearningContent(prev => prev.filter(c => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Failed to delete');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/telegram-bot/message-templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessageTemplates(prev => prev.filter(t => t.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Failed to delete');
    }
  };

  const handleDeleteButton = async (id: string) => {
    if (!confirm('Are you sure you want to delete this button?')) return;
    try {
      const res = await fetch(`/api/telegram-bot/button-labels?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setButtonLabels(prev => prev.filter(b => b.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Failed to delete');
    }
  };

  // Quick Action handlers
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleSendTestReminder = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/telegram-bot/send-test-reminder', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('✅ Test reminder sent successfully! Check your Telegram.');
      } else {
        alert(data.error || 'Failed to send test reminder');
      }
    } catch {
      alert('Failed to send test reminder');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!reminderStats?.pendingReminders) {
      alert('No pending reminders to retry');
      return;
    }
    setIsRetryingFailed(true);
    try {
      const res = await fetch('/api/telegram-bot/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry-all-pending' }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Retried ${data.count || 0} pending reminders`);
        fetchData(); // Refresh stats
      } else {
        alert(data.error || 'Failed to retry reminders');
      }
    } catch {
      alert('Failed to retry reminders');
    } finally {
      setIsRetryingFailed(false);
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/telegram-bot/reminders?date=${reminderDate}&format=csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `checkout-reminders-${reminderDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to export report');
      }
    } catch {
      alert('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reminders' as TabId, label: 'Reminders', icon: Bell },
    { id: 'learning' as TabId, label: 'Learning Content', icon: BookOpen },
    { id: 'messages' as TabId, label: 'Messages', icon: MessageSquare },
    { id: 'buttons' as TabId, label: 'Buttons', icon: MousePointerClick },
    { id: 'settings' as TabId, label: 'Settings', icon: Settings },
  ];

  const filteredContent = contentTypeFilter === 'all'
    ? learningContent
    : learningContent.filter(c => c.type === contentTypeFilter);

  const getContentTypeConfig = (type: string) => {
    return CONTENT_TYPES.find(t => t.value === type) || CONTENT_TYPES[0];
  };

  const getCategoryConfig = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  const getStatusBadge = (status: string, responseType: string | null) => {
    if (status === 'completed' || responseType === 'i_left') {
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Completed</span>;
    }
    if (status === 'scheduled') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Scheduled</span>;
    }
    if (status === 'pending' || status === 'sent') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Pending</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{status}</span>;
  };

  const getResponseLabel = (responseType: string | null) => {
    if (!responseType) return <span className="text-gray-400">—</span>;
    const labels: Record<string, string> = {
      'i_left': '🚪 I left',
      'im_at_work': '🏢 At work',
      '45min': '⏱️ 45 minutes',
      '2hours': '🕐 2 hours',
      'all_day': '🌙 All day',
    };
    return <span className="text-sm text-gray-900">{labels[responseType] || responseType}</span>;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <PageGuard permission={PERMISSIONS.TELEGRAM_BOT_VIEW}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Telegram Bot Admin</h1>
              <p className="text-gray-500">Manage checkout reminders, content, and settings</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={32} className="text-purple-600 animate-spin" />
              <span className="text-gray-500">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            {error}
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">Today&apos;s Reminders</span>
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Bell size={16} className="text-blue-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{reminderStats?.totalReminders || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {reminderStats?.dayShiftReminders || 0} day / {reminderStats?.nightShiftReminders || 0} night shift
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">Response Rate</span>
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Check size={16} className="text-green-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{reminderStats?.responseRate || 0}%</p>
                    <p className={`text-xs mt-1 ${(reminderStats?.responseRateChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(reminderStats?.responseRateChange || 0) >= 0 ? '↑' : '↓'} {Math.abs(reminderStats?.responseRateChange || 0)}% from last week
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">IP Verified</span>
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Shield size={16} className="text-purple-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{reminderStats?.verificationRate || 0}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {reminderStats?.verifiedCount || 0} of {reminderStats?.completedCount || 0} checkouts
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">Pending Now</span>
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Clock size={16} className="text-orange-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{reminderStats?.pendingReminders || 0}</p>
                    <p className="text-xs text-orange-600 mt-1">Awaiting response</p>
                  </div>
                </div>

                {/* Flow Diagram + Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Flow Diagram */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Checkout Reminder Flow</h3>
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex items-center gap-4 w-full max-w-lg">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">1</div>
                        <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="font-medium text-blue-900">⏰ Cron Trigger</p>
                          <p className="text-xs text-blue-700">Day: 6:30 PM • Night: 10:00 AM</p>
                        </div>
                      </div>

                      <ArrowDown size={24} className="text-gray-300" />

                      <div className="flex items-center gap-4 w-full max-w-lg">
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">2</div>
                        <div className="flex-1 bg-purple-50 rounded-lg p-3 border border-purple-200">
                          <p className="font-medium text-purple-900">📱 Send WebApp Button</p>
                          <p className="text-xs text-purple-700">User opens mini app in Telegram</p>
                        </div>
                      </div>

                      <ArrowDown size={24} className="text-gray-300" />

                      <div className="flex items-center gap-4 w-full max-w-lg">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">3</div>
                        <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="font-medium text-green-900">🌐 Check IP Address</p>
                          <p className="text-xs text-green-700">Compare with branch office IPs</p>
                        </div>
                      </div>

                      <ArrowDown size={24} className="text-gray-300" />

                      <div className="flex items-center gap-8 w-full max-w-2xl">
                        <div className="flex-1 bg-green-100 rounded-lg p-3 border border-green-300">
                          <p className="font-medium text-green-800 text-sm">✅ IP Matched</p>
                          <p className="text-xs text-green-700 mt-1">Show time options:</p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            <span className="px-2 py-1 bg-white text-green-700 rounded text-xs">45 min</span>
                            <span className="px-2 py-1 bg-white text-green-700 rounded text-xs">2 hrs</span>
                            <span className="px-2 py-1 bg-white text-green-700 rounded text-xs">All day</span>
                          </div>
                        </div>
                        <div className="flex-1 bg-orange-100 rounded-lg p-3 border border-orange-300">
                          <p className="font-medium text-orange-800 text-sm">❓ IP Not Matched</p>
                          <p className="text-xs text-orange-700 mt-1">Ask if still at work:</p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            <span className="px-2 py-1 bg-white text-orange-700 rounded text-xs">🏢 At work</span>
                            <span className="px-2 py-1 bg-white text-orange-700 rounded text-xs">🚪 I left</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions + Schedule */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">Reminder Schedule</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">☀️</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Day Shift</p>
                              <p className="text-xs text-gray-500">Check-in ≤ 3:30 PM</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">6:30 PM</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🌙</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Night Shift</p>
                              <p className="text-xs text-gray-500">Check-in &gt; 3:30 PM</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">10:00 AM</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        <button
                          onClick={handleSendTestReminder}
                          disabled={isSendingTest}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            {isSendingTest ? <RefreshCw size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{isSendingTest ? 'Sending...' : 'Send Test Reminder'}</p>
                            <p className="text-xs text-gray-500">To your Telegram</p>
                          </div>
                        </button>
                        <button
                          onClick={handleRetryFailed}
                          disabled={isRetryingFailed || !reminderStats?.pendingReminders}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            {isRetryingFailed ? <RefreshCw size={16} className="text-white animate-spin" /> : <RotateCcw size={16} className="text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{isRetryingFailed ? 'Retrying...' : 'Retry Failed'}</p>
                            <p className="text-xs text-gray-500">{reminderStats?.pendingReminders || 0} pending reminders</p>
                          </div>
                        </button>
                        <button
                          onClick={handleExportReport}
                          disabled={isExporting}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                            {isExporting ? <RefreshCw size={16} className="text-white animate-spin" /> : <Download size={16} className="text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{isExporting ? 'Exporting...' : 'Export Report'}</p>
                            <p className="text-xs text-gray-500">Download as CSV</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-5 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Recent Reminder Activity</h3>
                      <button
                        onClick={() => setActiveTab('reminders')}
                        className="text-sm text-purple-600 hover:underline"
                      >
                        View All →
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {recentReminders.length === 0 ? (
                      <div className="px-5 py-8 text-center text-gray-500">
                        No recent reminder activity
                      </div>
                    ) : (
                      recentReminders.map(reminder => (
                        <div key={reminder.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            reminder.status === 'completed' || reminder.responseType === 'i_left'
                              ? 'bg-green-100'
                              : reminder.responseType === '45min' || reminder.responseType === '2hours'
                              ? 'bg-blue-100'
                              : reminder.responseType === 'im_at_work'
                              ? 'bg-orange-100'
                              : reminder.responseType === 'all_day'
                              ? 'bg-purple-100'
                              : 'bg-gray-100'
                          }`}>
                            {reminder.status === 'completed' || reminder.responseType === 'i_left' ? (
                              <Check size={20} className="text-green-600" />
                            ) : reminder.responseType === '45min' || reminder.responseType === '2hours' ? (
                              <Clock size={20} className="text-blue-600" />
                            ) : (
                              <Bell size={20} className="text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{reminder.employeeName}</p>
                            <p className="text-xs text-gray-500">
                              {reminder.ipVerified ? 'IP verified' : 'IP not matched'} •{' '}
                              {getResponseLabel(reminder.responseType)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{formatTime(reminder.sentAt || reminder.createdAt)}</p>
                            {reminder.ipVerified ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Verified</span>
                            ) : (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Unverified</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Reminders Tab */}
            {activeTab === 'reminders' && (
              <div>
                {/* Filters */}
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Filter:</span>
                    {['all', 'pending', 'completed', 'scheduled'].map(status => (
                      <button
                        key={status}
                        onClick={() => setReminderStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          reminderStatusFilter === status
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Shift:</span>
                    <button
                      onClick={() => setReminderShiftFilter(reminderShiftFilter === 'day' ? 'all' : 'day')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        reminderShiftFilter === 'day'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      ☀️ Day
                    </button>
                    <button
                      onClick={() => setReminderShiftFilter(reminderShiftFilter === 'night' ? 'all' : 'night')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        reminderShiftFilter === 'night'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      🌙 Night
                    </button>
                  </div>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={e => setReminderDate(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                  />
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reminders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No reminders found for this date
                          </td>
                        </tr>
                      ) : (
                        reminders.map(reminder => (
                          <tr key={reminder.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-medium text-sm">
                                  {getInitials(reminder.employeeName)}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{reminder.employeeName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">{reminder.shiftType === 'day' ? '☀️ Day' : '🌙 Night'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">{formatTime(reminder.sentAt)}</span>
                            </td>
                            <td className="px-4 py-3">{getResponseLabel(reminder.responseType)}</td>
                            <td className="px-4 py-3">
                              {reminder.responseType ? (
                                reminder.ipVerified ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Verified</span>
                                ) : (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Not Matched</span>
                                )
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(reminder.status, reminder.responseType)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Learning Content Tab */}
            {activeTab === 'learning' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setContentTypeFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        contentTypeFilter === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      All
                    </button>
                    {CONTENT_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setContentTypeFilter(type.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          contentTypeFilter === type.value ? type.color : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {type.emoji} {type.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setEditingContent(null);
                      setShowLearningModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus size={18} />
                    Add Content
                  </button>
                </div>

                {filteredContent.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No learning content yet. Click &quot;Add Content&quot; to create one.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredContent.map(content => {
                      const typeConfig = getContentTypeConfig(content.type);
                      const categoryConfig = getCategoryConfig(content.category);
                      return (
                        <div key={content.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          <div className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-2 py-1 ${typeConfig.color} rounded text-xs font-medium`}>
                                    {typeConfig.emoji} {typeConfig.label}
                                  </span>
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                    {categoryConfig.label}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    content.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {content.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-1">
                                  {content.title?.[selectedLang] || content.title?.en || 'Untitled'}
                                </h3>
                                <p className="text-sm text-gray-500 line-clamp-2">
                                  {content.content?.[selectedLang] || content.content?.en || ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingContent(content);
                                    setShowLearningModal(true);
                                  }}
                                  className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                  <Pencil size={18} className="text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteContent(content.id)}
                                  className="p-2 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={18} className="text-gray-500 hover:text-red-600" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 border-t border-gray-100 pt-4">
                              <div className="flex gap-2 mb-3">
                                {LANGUAGES.map(lang => (
                                  <button
                                    key={lang.code}
                                    onClick={() => setSelectedLang(lang.code)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                                      selectedLang === lang.code ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    {lang.flag} {lang.name}
                                  </button>
                                ))}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-700">
                                  {content.content?.[selectedLang] || content.content?.en || 'No content'}
                                </p>
                                {content.type === 'quiz' && content.quiz_options && (
                                  <div className="mt-3 space-y-2">
                                    {content.quiz_options.map((opt: LocalizedContent, idx: number) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium ${
                                          idx === content.quiz_correct_index
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                          {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                          {opt[selectedLang] || opt.en || ''}
                                        </span>
                                        {idx === content.quiz_correct_index && (
                                          <Check size={14} className="text-green-600" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Message Templates Tab */}
            {activeTab === 'messages' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-500">Manage message templates for bot communications</p>
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowMessageModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus size={18} />
                    Add Template
                  </button>
                </div>

                {messageTemplates.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No message templates yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messageTemplates.map(template => (
                      <div key={template.id} className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                                {template.key}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {template.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">{template.description}</p>

                            <div className="flex gap-2 mb-3">
                              {LANGUAGES.map(lang => (
                                <button
                                  key={lang.code}
                                  onClick={() => setSelectedLang(lang.code)}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                                    selectedLang === lang.code ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {lang.flag} {lang.name}
                                </button>
                              ))}
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {template.content?.[selectedLang] || template.content?.en || ''}
                              </p>
                            </div>
                            {template.available_placeholders && template.available_placeholders.length > 0 && (
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500">Placeholders:</span>
                                {template.available_placeholders.map(p => (
                                  <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                                    {'{' + p + '}'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingTemplate(template);
                                setShowMessageModal(true);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                              <Pencil size={18} className="text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-2 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={18} className="text-gray-500 hover:text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Button Labels Tab */}
            {activeTab === 'buttons' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-500">Manage button labels for bot interactions</p>
                  <button
                    onClick={() => {
                      setEditingButton(null);
                      setShowButtonModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus size={18} />
                    Add Button
                  </button>
                </div>

                {buttonLabels.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <MousePointerClick size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No button labels yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {buttonLabels.map(button => (
                      <div key={button.id} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                            {button.key}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingButton(button);
                                setShowButtonModal(true);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded"
                            >
                              <Pencil size={14} className="text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteButton(button.id)}
                              className="p-1.5 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} className="text-gray-500 hover:text-red-600" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{button.description}</p>
                        <div className="space-y-2">
                          {LANGUAGES.map(lang => (
                            <div key={lang.code} className="flex items-center gap-2">
                              <span className="text-sm">{lang.flag}</span>
                              <span className="flex-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                                {button.emoji && <span className="mr-1">{button.emoji}</span>}
                                {button.label?.[lang.code] || button.label?.en || ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Bot Settings</h3>
                <div className="space-y-4">
                  <SettingItem
                    label="Day Shift Reminder Time"
                    description="When to send checkout reminders for day shift employees"
                    defaultValue="18:30"
                    settingKey="day_shift_reminder_time"
                    settings={botSettings}
                    onUpdate={fetchData}
                  />
                  <SettingItem
                    label="Night Shift Reminder Time"
                    description="When to send checkout reminders for night shift employees (next day)"
                    defaultValue="10:00"
                    settingKey="night_shift_reminder_time"
                    settings={botSettings}
                    onUpdate={fetchData}
                  />
                  <SettingItem
                    label="Day Shift Cutoff Time"
                    description="Check-ins at or before this time are day shift, after are night shift"
                    defaultValue="15:30"
                    settingKey="day_shift_cutoff_time"
                    settings={botSettings}
                    onUpdate={fetchData}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Learning Content Modal */}
        {showLearningModal && (
          <LearningContentModal
            content={editingContent}
            onClose={() => setShowLearningModal(false)}
            onSave={() => {
              setShowLearningModal(false);
              fetchData();
            }}
          />
        )}

        {/* Message Template Modal */}
        {showMessageModal && (
          <MessageTemplateModal
            template={editingTemplate}
            onClose={() => setShowMessageModal(false)}
            onSave={() => {
              setShowMessageModal(false);
              fetchData();
            }}
          />
        )}

        {/* Button Label Modal */}
        {showButtonModal && (
          <ButtonLabelModal
            button={editingButton}
            onClose={() => setShowButtonModal(false)}
            onSave={() => {
              setShowButtonModal(false);
              fetchData();
            }}
          />
        )}
      </div>
    </PageGuard>
  );
}

// Setting Item Component
function SettingItem({
  label,
  description,
  defaultValue,
  settingKey,
  settings,
  onUpdate,
}: {
  label: string;
  description: string;
  defaultValue: string;
  settingKey: string;
  settings: BotSettings[];
  onUpdate: () => void;
}) {
  const currentSetting = settings.find(s => s.key === settingKey);
  const [value, setValue] = useState(currentSetting?.value || defaultValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/telegram-bot/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingKey, value, description }),
      });
      if (res.ok) {
        onUpdate();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-center"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {isSaving ? '...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// Learning Content Modal Component
function LearningContentModal({
  content,
  onClose,
  onSave,
}: {
  content: BotLearningContent | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    type: content?.type || 'tip',
    category: content?.category || 'service_excellence',
    title: content?.title || { en: '', ru: '', uz: '' },
    content: content?.content || { en: '', ru: '', uz: '' },
    quiz_options: content?.quiz_options || [{ en: '', ru: '', uz: '' }, { en: '', ru: '', uz: '' }],
    quiz_correct_index: content?.quiz_correct_index || 0,
    quiz_explanation: content?.quiz_explanation || { en: '', ru: '', uz: '' },
    is_active: content?.is_active ?? true,
    display_order: content?.display_order || 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<SupportedLanguage>('en');

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const url = '/api/telegram-bot/learning-content';
      const method = content ? 'PUT' : 'POST';
      const body = content ? { id: content.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateLocalizedField = (field: 'title' | 'content' | 'quiz_explanation', lang: SupportedLanguage, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: { ...prev[field], [lang]: value },
    }));
  };

  const updateQuizOption = (index: number, lang: SupportedLanguage, value: string) => {
    setFormData(prev => {
      const newOptions = [...prev.quiz_options];
      newOptions[index] = { ...newOptions[index], [lang]: value };
      return { ...prev, quiz_options: newOptions };
    });
  };

  const addQuizOption = () => {
    setFormData(prev => ({
      ...prev,
      quiz_options: [...prev.quiz_options, { en: '', ru: '', uz: '' }],
    }));
  };

  const removeQuizOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      quiz_options: prev.quiz_options.filter((_, i) => i !== index),
      quiz_correct_index: prev.quiz_correct_index >= index && prev.quiz_correct_index > 0
        ? prev.quiz_correct_index - 1
        : prev.quiz_correct_index,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {content ? 'Edit Learning Content' : 'Add Learning Content'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as 'tip' | 'scenario' | 'quiz' | 'reflection' }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                {CONTENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as 'service_excellence' | 'team_collaboration' | 'customer_handling' | 'company_values' | 'professional_growth' }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setActiveLang(lang.code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                  activeLang === lang.code ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title ({activeLang.toUpperCase()})</label>
            <input
              type="text"
              value={formData.title[activeLang]}
              onChange={e => updateLocalizedField('title', activeLang, e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="Enter title..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Content ({activeLang.toUpperCase()})</label>
            <textarea
              value={formData.content[activeLang]}
              onChange={e => updateLocalizedField('content', activeLang, e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="Enter content..."
            />
          </div>

          {formData.type === 'quiz' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Options ({activeLang.toUpperCase()})</label>
                <div className="space-y-2">
                  {formData.quiz_options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, quiz_correct_index: idx }))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                          formData.quiz_correct_index === idx
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </button>
                      <input
                        type="text"
                        value={opt[activeLang] || ''}
                        onChange={e => updateQuizOption(idx, activeLang, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                        placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                      />
                      {formData.quiz_options.length > 2 && (
                        <button
                          onClick={() => removeQuizOption(idx)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.quiz_options.length < 5 && (
                  <button
                    onClick={addQuizOption}
                    className="mt-2 text-sm text-purple-600 hover:underline"
                  >
                    + Add option
                  </button>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation ({activeLang.toUpperCase()})</label>
                <textarea
                  value={formData.quiz_explanation[activeLang]}
                  onChange={e => updateLocalizedField('quiz_explanation', activeLang, e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Explanation for the correct answer..."
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 text-purple-600"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Message Template Modal Component
function MessageTemplateModal({
  template,
  onClose,
  onSave,
}: {
  template: BotMessageTemplate | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    key: template?.key || '',
    description: template?.description || '',
    content: template?.content || { en: '', ru: '', uz: '' },
    available_placeholders: template?.available_placeholders || [],
    is_active: template?.is_active ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<SupportedLanguage>('en');
  const [newPlaceholder, setNewPlaceholder] = useState('');

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const url = '/api/telegram-bot/message-templates';
      const method = template ? 'PUT' : 'POST';
      const body = template ? { id: template.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const addPlaceholder = () => {
    if (newPlaceholder && !formData.available_placeholders.includes(newPlaceholder)) {
      setFormData(prev => ({
        ...prev,
        available_placeholders: [...prev.available_placeholders, newPlaceholder],
      }));
      setNewPlaceholder('');
    }
  };

  const removePlaceholder = (p: string) => {
    setFormData(prev => ({
      ...prev,
      available_placeholders: prev.available_placeholders.filter(x => x !== p),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {template ? 'Edit Message Template' : 'Add Message Template'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
              <input
                type="text"
                value={formData.key}
                onChange={e => setFormData(prev => ({ ...prev, key: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                placeholder="e.g., checkout_reminder"
                disabled={!!template}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                placeholder="What this template is for..."
              />
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setActiveLang(lang.code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                  activeLang === lang.code ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Message Content ({activeLang.toUpperCase()})</label>
            <textarea
              value={formData.content[activeLang]}
              onChange={e => setFormData(prev => ({ ...prev, content: { ...prev.content, [activeLang]: e.target.value } }))}
              rows={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm"
              placeholder="Enter message content..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Placeholders</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.available_placeholders.map(p => (
                <span key={p} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  {'{' + p + '}'}
                  <button onClick={() => removePlaceholder(p)} className="text-gray-400 hover:text-red-600">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlaceholder}
                onChange={e => setNewPlaceholder(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm"
                placeholder="e.g., employee_name"
              />
              <button
                onClick={addPlaceholder}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-purple-600"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Button Label Modal Component
function ButtonLabelModal({
  button,
  onClose,
  onSave,
}: {
  button: BotButtonLabel | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    key: button?.key || '',
    description: button?.description || '',
    label: button?.label || { en: '', ru: '', uz: '' },
    emoji: button?.emoji || '',
    is_active: button?.is_active ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<SupportedLanguage>('en');

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const url = '/api/telegram-bot/button-labels';
      const method = button ? 'PUT' : 'POST';
      const body = button ? { id: button.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {button ? 'Edit Button Label' : 'Add Button Label'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
            <input
              type="text"
              value={formData.key}
              onChange={e => setFormData(prev => ({ ...prev, key: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
              placeholder="e.g., confirm_checkout"
              disabled={!!button}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="What this button is for..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Emoji (optional)</label>
            <input
              type="text"
              value={formData.emoji}
              onChange={e => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="e.g., ✅"
            />
          </div>

          <div className="flex gap-2 mb-4">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setActiveLang(lang.code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                  activeLang === lang.code ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Button Label ({activeLang.toUpperCase()})</label>
            <input
              type="text"
              value={formData.label[activeLang]}
              onChange={e => setFormData(prev => ({ ...prev, label: { ...prev.label, [activeLang]: e.target.value } }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="Enter button text..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className="bg-gray-100 rounded-lg p-4 flex justify-center">
              <span className="px-4 py-2 bg-blue-500 text-white rounded-lg">
                {formData.emoji && <span className="mr-1">{formData.emoji}</span>}
                {formData.label[activeLang] || 'Button Text'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-purple-600"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
