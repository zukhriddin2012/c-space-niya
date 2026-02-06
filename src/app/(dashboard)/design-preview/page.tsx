'use client';

import React, { useState } from 'react';
import {
  Trash2, Bell, CheckCircle, Clock, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, X, Send, Users, Building2, Wallet,
  Download, BellRing, Check, Info
} from 'lucide-react';

// ========================================
// UI DESIGN MOCKUPS FOR PR2-017
// Wages Section Fixes
// ========================================

export default function WagesSectionMockups() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [showBulkNotifyDialog, setShowBulkNotifyDialog] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [bulkNotified, setBulkNotified] = useState(false);

  const tabs = [
    { id: 'overview', label: '1. Overview' },
    { id: 'delete', label: '2. Delete Request' },
    { id: 'duplicate', label: '3. Duplicate Prevention' },
    { id: 'notify', label: '4. Notifications' },
    { id: 'bulk', label: '5. Bulk Notify' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            PR2-017: Wages Section UI Designs
          </h1>
          <p className="text-gray-600">
            Interactive mockups for Delete, Duplicate Prevention, and Notification features
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm">
          {activeTab === 'overview' && <OverviewSection />}
          {activeTab === 'delete' && (
            <DeleteRequestSection
              showDialog={showDeleteDialog}
              setShowDialog={setShowDeleteDialog}
            />
          )}
          {activeTab === 'duplicate' && <DuplicatePreventionSection />}
          {activeTab === 'notify' && (
            <NotifySection
              showDialog={showNotifyDialog}
              setShowDialog={setShowNotifyDialog}
              notificationSent={notificationSent}
              setNotificationSent={setNotificationSent}
            />
          )}
          {activeTab === 'bulk' && (
            <BulkNotifySection
              showDialog={showBulkNotifyDialog}
              setShowDialog={setShowBulkNotifyDialog}
              bulkNotified={bulkNotified}
              setBulkNotified={setBulkNotified}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// SECTION 1: OVERVIEW
// ========================================
function OverviewSection() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Design Overview</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <FeatureCard
          icon={<Trash2 className="text-red-600" />}
          title="Delete Request"
          description="Delete button on payment requests with confirmation dialog. Available for Draft, Pending, Approved, Rejected statuses. Blocked for Paid."
          color="red"
        />
        <FeatureCard
          icon={<AlertTriangle className="text-orange-600" />}
          title="Duplicate Prevention"
          description="Visual indicators for already-paid employees. Grayed out rows, PAID column shows amounts, tooltips show payment details."
          color="orange"
        />
        <FeatureCard
          icon={<Bell className="text-blue-600" />}
          title="Manual Notifications"
          description="'Notify Employees' button appears after Approved/Paid. Shows count, changes to 'Notified' with timestamp after sending."
          color="blue"
        />
        <FeatureCard
          icon={<Users className="text-purple-600" />}
          title="Bulk Notifications"
          description="'Notify All Paid' button on dashboard. Shows un-notified count, sends to all paid requests at once."
          color="purple"
        />
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Design Principles</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <span>Use existing component patterns (Button, ConfirmationDialog, Badge)</span>
          </li>
          <li className="flex items-start gap-2">
            <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <span>Consistent color coding: Red for danger, Green for paid, Orange for warnings</span>
          </li>
          <li className="flex items-start gap-2">
            <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <span>Clear confirmation dialogs for destructive or irreversible actions</span>
          </li>
          <li className="flex items-start gap-2">
            <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <span>Visual feedback: Loading states, disabled states, success states</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }) {
  const bgColors = {
    red: 'bg-red-50',
    orange: 'bg-orange-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
  };

  return (
    <div className={`${bgColors[color]} rounded-lg p-4`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

// ========================================
// SECTION 2: DELETE REQUEST
// ========================================
function DeleteRequestSection({ showDialog, setShowDialog }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Payment Request</h2>

      {/* Design Spec */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Design Specification</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Delete button uses <code className="bg-blue-100 px-1 rounded">variant="danger"</code> (red)</li>
          <li>• Button shows Trash2 icon with "Delete" text</li>
          <li>• Hidden for requests with "Paid" status</li>
          <li>• Confirmation dialog with danger variant shows employee count and total amount</li>
        </ul>
      </div>

      {/* Mock Request Card */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">Wage Request #WR-2026-001</span>
            <StatusBadge status="draft" />
          </div>
          <div className="flex items-center gap-2">
            {/* DELETE BUTTON - THE NEW FEATURE */}
            <button
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Period:</span>
              <span className="ml-2 font-medium">January 2026</span>
            </div>
            <div>
              <span className="text-gray-500">Employees:</span>
              <span className="ml-2 font-medium">5</span>
            </div>
            <div>
              <span className="text-gray-500">Total:</span>
              <span className="ml-2 font-medium text-green-600">25,000,000 UZS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Examples */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Delete Button Visibility by Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <StatusDeleteExample status="draft" canDelete />
          <StatusDeleteExample status="pending_approval" canDelete />
          <StatusDeleteExample status="approved" canDelete />
          <StatusDeleteExample status="rejected" canDelete />
          <StatusDeleteExample status="paid" canDelete={false} />
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showDialog && (
        <DeleteConfirmationDialog onClose={() => setShowDialog(false)} />
      )}
    </div>
  );
}

function StatusDeleteExample({ status, canDelete }) {
  const labels = {
    draft: 'Draft',
    pending_approval: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
  };

  return (
    <div className={`p-3 rounded-lg border ${canDelete ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'}`}>
      <StatusBadge status={status} />
      <div className="mt-2 text-xs">
        {canDelete ? (
          <span className="text-green-600 flex items-center gap-1">
            <Check size={12} /> Can delete
          </span>
        ) : (
          <span className="text-red-600 flex items-center gap-1">
            <X size={12} /> No delete
          </span>
        )}
      </div>
    </div>
  );
}

function DeleteConfirmationDialog({ onClose }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="text-red-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Payment Request?
          </h3>
          <p className="text-gray-500 text-sm">
            This will permanently delete the wage request for <strong>5 employees</strong> totaling <strong className="text-green-600">25,000,000 UZS</strong>. This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// SECTION 3: DUPLICATE PREVENTION
// ========================================
function DuplicatePreventionSection() {
  const [hoveredRow, setHoveredRow] = useState(null);

  const employees = [
    { id: 1, name: 'Zuxriddin Abduraxmonov', position: 'COO', source: '2 sources', net: 30000000, paid: null, advance: null, wage: null },
    { id: 2, name: 'Nigina Umaraliyeva', position: 'Legal Specialist', source: 'C-SPACE YUNUSABAD', net: 10000000, paid: 4000000, paidDate: 'Jan 15, 2026', advance: null, wage: null, isPaidAdvance: true },
    { id: 3, name: 'Nabijon Turgunov', position: 'Branch Manager', source: 'C-SPACE MAKSIM GORKIY', net: 10000000, paid: 5000000, paidDate: 'Jan 12, 2026', advance: null, wage: null, isPaidAdvance: true },
    { id: 4, name: 'Durbek Shaymardanov', position: 'Branch Manager', source: 'C-SPACE', net: 15000000, paid: null, advance: 0, wage: 0 },
    { id: 5, name: 'Madina Shakirova', position: 'Accountant', source: '3 sources', net: 27000000, paid: 27000000, paidDate: 'Jan 20, 2026', advance: null, wage: null, isPaidWage: true },
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Duplicate Payment Prevention</h2>

      {/* Design Spec */}
      <div className="mb-6 p-4 bg-orange-50 rounded-lg">
        <h3 className="font-medium text-orange-900 mb-2">Design Specification</h3>
        <ul className="space-y-1 text-sm text-orange-800">
          <li>• <strong>PAID column</strong>: Shows actual paid amounts in green with checkmark icon</li>
          <li>• <strong>Grayed out rows</strong>: Employees already paid have <code className="bg-orange-100 px-1 rounded">bg-gray-50 opacity-60</code></li>
          <li>• <strong>Blocked inputs</strong>: Advance/Wage inputs disabled for paid employees</li>
          <li>• <strong>Tooltip on hover</strong>: Shows "Paid X UZS on [date]"</li>
          <li>• <strong>Hard block</strong>: Cannot add already-paid employees to new requests</li>
        </ul>
      </div>

      {/* Employee Wages Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">Employee Wages</span>
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
              <Building2 size={12} /> Primary: 309,800,000 UZS
            </span>
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
              Additional: 34,000,000 UZS
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left font-medium">Employee</th>
                <th className="px-4 py-3 text-left font-medium">Position</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-right font-medium">Total Net</th>
                <th className="px-4 py-3 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-600" />
                    Paid
                  </span>
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Wallet size={12} className="text-orange-600" />
                    Advance
                  </span>
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Wallet size={12} className="text-green-600" />
                    Wage
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const isPaid = emp.paid !== null;
                return (
                  <tr
                    key={emp.id}
                    className={`border-b border-gray-100 ${isPaid ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}
                    onMouseEnter={() => isPaid && setHoveredRow(emp.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="px-4 py-3">
                      <span className={`font-medium ${isPaid ? 'text-gray-500' : 'text-gray-900'}`}>
                        {emp.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp.position}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        <Building2 size={14} className="text-gray-400" />
                        {emp.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {(emp.net / 1000000).toFixed(0)}M UZS
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      {isPaid ? (
                        <div className="relative">
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle size={14} />
                            {(emp.paid / 1000000).toFixed(1)}M
                          </span>
                          {/* Tooltip */}
                          {hoveredRow === emp.id && (
                            <div className="absolute right-0 bottom-full mb-2 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
                              <div className="font-medium">
                                {emp.isPaidAdvance ? 'Advance' : 'Wage'} Payment
                              </div>
                              <div>
                                Paid {(emp.paid / 1000000).toFixed(1)}M UZS on {emp.paidDate}
                              </div>
                              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isPaid ? (
                        <div className="flex justify-center">
                          <span className="px-3 py-1 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed">
                            Blocked
                          </span>
                        </div>
                      ) : (
                        <input
                          type="number"
                          defaultValue={emp.advance || 0}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isPaid ? (
                        <div className="flex justify-center">
                          <span className="px-3 py-1 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed">
                            Blocked
                          </span>
                        </div>
                      ) : (
                        <input
                          type="number"
                          defaultValue={emp.wage || 0}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded opacity-60" />
          <span className="text-gray-600">Already paid (grayed out)</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-gray-600">Paid amount shown</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-xs">Blocked</span>
          <span className="text-gray-600">Cannot add to new request</span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// SECTION 4: MANUAL NOTIFICATIONS
// ========================================
function NotifySection({ showDialog, setShowDialog, notificationSent, setNotificationSent }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Telegram Notifications</h2>

      {/* Design Spec */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Design Specification</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Button appears only for <strong>Approved</strong> or <strong>Paid</strong> status</li>
          <li>• Shows employee count: "Notify 5 Employees"</li>
          <li>• Uses <code className="bg-blue-100 px-1 rounded">variant="info"</code> (blue) with Bell icon</li>
          <li>• After sent: Changes to "Notified" with timestamp, disabled state</li>
          <li>• Confirmation dialog before sending</li>
        </ul>
      </div>

      {/* Button States Demo */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Notify Button States</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* State 1: Not Available */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2">Draft / Pending Status</div>
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed opacity-50"
            >
              <Bell size={16} />
              Notify Employees
            </button>
            <p className="mt-2 text-xs text-gray-500">Hidden or disabled until approved</p>
          </div>

          {/* State 2: Ready to Send */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="text-xs text-blue-600 mb-2">Approved / Paid Status</div>
            <button
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Bell size={16} />
              Notify 5 Employees
            </button>
            <p className="mt-2 text-xs text-blue-600">Click to send notifications</p>
          </div>

          {/* State 3: Already Sent */}
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <div className="text-xs text-green-600 mb-2">Notification Sent</div>
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              <CheckCircle size={16} />
              Notified
            </button>
            <p className="mt-2 text-xs text-green-600">Sent on Jan 20, 2026 at 14:32</p>
          </div>
        </div>
      </div>

      {/* Mock Request with Notify Button */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">Wage Request #WR-2026-002</span>
            <StatusBadge status="paid" />
          </div>
          <div className="flex items-center gap-2">
            {/* NOTIFY BUTTON - THE NEW FEATURE */}
            {notificationSent ? (
              <button
                disabled
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                <CheckCircle size={16} />
                Notified
              </button>
            ) : (
              <button
                onClick={() => setShowDialog(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Bell size={16} />
                Notify 5 Employees
              </button>
            )}
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Period:</span>
              <span className="ml-2 font-medium">January 2026</span>
            </div>
            <div>
              <span className="text-gray-500">Paid on:</span>
              <span className="ml-2 font-medium">Jan 20, 2026</span>
            </div>
            <div>
              <span className="text-gray-500">Total:</span>
              <span className="ml-2 font-medium text-green-600">25,000,000 UZS</span>
            </div>
          </div>
          {notificationSent && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="inline-flex items-center gap-2 text-xs text-green-600">
                <BellRing size={14} />
                Telegram notifications sent on Jan 20, 2026 at 14:32
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notification Confirmation Dialog */}
      {showDialog && (
        <NotifyConfirmationDialog
          onClose={() => setShowDialog(false)}
          onConfirm={() => {
            setNotificationSent(true);
            setShowDialog(false);
          }}
        />
      )}
    </div>
  );
}

function NotifyConfirmationDialog({ onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onConfirm();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Send className="text-blue-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Send Telegram Notifications?
          </h3>
          <p className="text-gray-500 text-sm">
            This will send payment notifications to <strong>5 employees</strong> about their wage payment of <strong className="text-green-600">25,000,000 UZS</strong> for January 2026.
          </p>
        </div>

        {/* Preview */}
        <div className="mx-6 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Message Preview:</div>
          <div className="text-sm text-gray-700">
            💵 <strong>To'lov amalga oshirildi!</strong><br/>
            Oylik to'lovi: 5,000,000 UZS<br/>
            Davr: Yanvar 2026
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Notifications
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// SECTION 5: BULK NOTIFICATIONS
// ========================================
function BulkNotifySection({ showDialog, setShowDialog, bulkNotified, setBulkNotified }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Notification (Notify All Paid)</h2>

      {/* Design Spec */}
      <div className="mb-6 p-4 bg-purple-50 rounded-lg">
        <h3 className="font-medium text-purple-900 mb-2">Design Specification</h3>
        <ul className="space-y-1 text-sm text-purple-800">
          <li>• Button placed in Payroll dashboard header area</li>
          <li>• Shows count of un-notified paid requests: "Notify All (3)"</li>
          <li>• Uses <code className="bg-purple-100 px-1 rounded">variant="secondary"</code> with BellRing icon</li>
          <li>• Disabled when no un-notified requests exist</li>
          <li>• Confirmation shows breakdown: X Advance, Y Wage requests</li>
        </ul>
      </div>

      {/* Mock Dashboard Header */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Payroll</h2>
              <p className="text-sm text-gray-500">Manage employee wages and payment processing for January 2026</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                <Download size={20} />
                Export
              </button>

              {/* BULK NOTIFY BUTTON - THE NEW FEATURE */}
              {bulkNotified ? (
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-100 text-green-700 border border-green-200 rounded-lg font-medium cursor-not-allowed"
                >
                  <CheckCircle size={20} />
                  All Notified
                </button>
              ) : (
                <button
                  onClick={() => setShowDialog(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-purple-300 bg-purple-50 text-purple-700 rounded-lg font-medium hover:bg-purple-100 transition-colors"
                >
                  <BellRing size={20} />
                  Notify All Paid
                  <span className="ml-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">3</span>
                </button>
              )}

              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                <Wallet size={20} />
                Process Payroll
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Net" value="343.8M UZS" />
            <StatCard label="Advance Paid" value="76.1M UZS" color="orange" />
            <StatCard label="Wage Paid" value="236.1M UZS" color="green" />
            <StatCard label="Remaining" value="31.5M UZS" color="red" />
          </div>
        </div>
      </div>

      {/* Un-notified Requests Preview */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Un-notified Paid Requests (3)</h3>
        <div className="space-y-2">
          <UnnotifiedRequestRow type="Advance" id="AR-2026-003" employees={3} amount="9,000,000" />
          <UnnotifiedRequestRow type="Wage" id="WR-2026-002" employees={5} amount="25,000,000" />
          <UnnotifiedRequestRow type="Wage" id="WR-2026-003" employees={8} amount="42,500,000" />
        </div>
      </div>

      {/* Bulk Notify Confirmation Dialog */}
      {showDialog && (
        <BulkNotifyConfirmationDialog
          onClose={() => setShowDialog(false)}
          onConfirm={() => {
            setBulkNotified(true);
            setShowDialog(false);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'gray' }) {
  const colors = {
    gray: 'text-gray-900',
    orange: 'text-orange-600',
    green: 'text-green-600',
    red: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${colors[color]}`}>{value}</p>
    </div>
  );
}

function UnnotifiedRequestRow({ type, id, employees, amount }) {
  const isAdvance = type === 'Advance';
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${isAdvance ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
          {type}
        </span>
        <span className="font-medium text-gray-900">{id}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">{employees} employees</span>
        <span className={`font-medium ${isAdvance ? 'text-orange-600' : 'text-green-600'}`}>{amount} UZS</span>
        <span className="inline-flex items-center gap-1 text-yellow-600">
          <Clock size={14} />
          Pending notification
        </span>
      </div>
    </div>
  );
}

function BulkNotifyConfirmationDialog({ onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onConfirm();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Users className="text-purple-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Notify All Paid Requests?
          </h3>
          <p className="text-gray-500 text-sm">
            This will send Telegram notifications for all un-notified paid requests in January 2026.
          </p>
        </div>

        {/* Summary */}
        <div className="mx-6 mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Advance Requests:</span>
            <span className="font-medium text-orange-600">1 request (3 employees)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Wage Requests:</span>
            <span className="font-medium text-green-600">2 requests (13 employees)</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-900">Total:</span>
              <span className="text-purple-600">16 employees will be notified</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <BellRing size={16} />
                Notify All
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// SHARED COMPONENTS
// ========================================
function StatusBadge({ status }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: Clock },
    pending_approval: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
    approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700', icon: XCircle },
    paid: { label: 'Paid', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  };

  const { label, className, icon: Icon } = config[status] || config.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
