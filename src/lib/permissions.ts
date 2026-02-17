import type { UserRole } from '@/types';

// All available permissions in the system
export const PERMISSIONS = {
  // Employee Management
  EMPLOYEES_VIEW: 'employees:view',
  EMPLOYEES_VIEW_ALL: 'employees:view_all',
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_EDIT: 'employees:edit',
  EMPLOYEES_DELETE: 'employees:delete',
  EMPLOYEES_VIEW_SALARY: 'employees:view_salary',
  EMPLOYEES_EDIT_SALARY: 'employees:edit_salary',

  // Attendance
  ATTENDANCE_VIEW: 'attendance:view',
  ATTENDANCE_VIEW_ALL: 'attendance:view_all',
  ATTENDANCE_EDIT: 'attendance:edit',
  ATTENDANCE_EXPORT: 'attendance:export',

  // Branches
  BRANCHES_VIEW: 'branches:view',
  BRANCHES_CREATE: 'branches:create',
  BRANCHES_EDIT: 'branches:edit',
  BRANCHES_DELETE: 'branches:delete',
  BRANCHES_MANAGE_GEOFENCE: 'branches:manage_geofence',

  // Payroll
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_VIEW_ALL: 'payroll:view_all',
  PAYROLL_PROCESS: 'payroll:process',
  PAYROLL_APPROVE: 'payroll:approve',

  // Leave/Time Off
  LEAVE_VIEW: 'leave:view',
  LEAVE_REQUEST: 'leave:request',
  LEAVE_APPROVE: 'leave:approve',
  LEAVE_MANAGE: 'leave:manage',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_ANALYTICS: 'reports:analytics',

  // Tasks
  TASKS_VIEW: 'tasks:view',
  TASKS_CREATE: 'tasks:create',
  TASKS_ASSIGN: 'tasks:assign',
  TASKS_DELETE: 'tasks:delete',

  // Recruitment
  RECRUITMENT_VIEW: 'recruitment:view',
  RECRUITMENT_MANAGE: 'recruitment:manage',

  // User Management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_ASSIGN_ROLES: 'users:assign_roles',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',

  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_ADMIN: 'dashboard:admin',

  // Feedback
  FEEDBACK_SUBMIT: 'feedback:submit',
  FEEDBACK_VIEW_ALL: 'feedback:view_all',

  // Finance/Transactions
  FINANCES_VIEW: 'finances:view',
  FINANCES_VIEW_ALL: 'finances:view_all',
  FINANCES_EDIT: 'finances:edit',
  FINANCES_EXPORT: 'finances:export',

  // Accounting Requests
  ACCOUNTING_REQUESTS_VIEW: 'accounting_requests:view',
  ACCOUNTING_REQUESTS_VIEW_ALL: 'accounting_requests:view_all',
  ACCOUNTING_REQUESTS_CREATE: 'accounting_requests:create',
  ACCOUNTING_REQUESTS_EDIT_OWN: 'accounting_requests:edit_own',
  ACCOUNTING_REQUESTS_CANCEL_OWN: 'accounting_requests:cancel_own',
  ACCOUNTING_REQUESTS_PROCESS: 'accounting_requests:process',
  ACCOUNTING_REQUESTS_APPROVE_STANDARD: 'accounting_requests:approve_standard', // 2M-10M UZS
  ACCOUNTING_REQUESTS_APPROVE_HIGH: 'accounting_requests:approve_high', // 10M+ UZS
  ACCOUNTING_REQUESTS_REPORTS: 'accounting_requests:reports',

  // Telegram Bot Management
  TELEGRAM_BOT_VIEW: 'telegram_bot:view',
  TELEGRAM_BOT_EDIT: 'telegram_bot:edit',

  // Shift Planning
  SHIFTS_VIEW: 'shifts:view',
  SHIFTS_VIEW_ALL: 'shifts:view_all',
  SHIFTS_EDIT: 'shifts:edit',
  SHIFTS_EDIT_OWN_BRANCH: 'shifts:edit_own_branch',
  SHIFTS_PUBLISH: 'shifts:publish',
  SHIFTS_MANAGE_REQUIREMENTS: 'shifts:manage_requirements',

  // Reception Mode
  RECEPTION_VIEW: 'reception:view',
  RECEPTION_TRANSACTIONS_CREATE: 'reception:transactions:create',
  RECEPTION_TRANSACTIONS_VIEW: 'reception:transactions:view',
  RECEPTION_TRANSACTIONS_EDIT: 'reception:transactions:edit',
  RECEPTION_TRANSACTIONS_VOID: 'reception:transactions:void',
  RECEPTION_EXPENSES_CREATE: 'reception:expenses:create',
  RECEPTION_EXPENSES_VIEW: 'reception:expenses:view',
  RECEPTION_EXPENSES_EDIT: 'reception:expenses:edit',
  RECEPTION_EXPENSES_VOID: 'reception:expenses:void',
  RECEPTION_ADMIN: 'reception:admin',  // Admin configuration access
  RECEPTION_REPORTS: 'reception:reports',

  // Reception — Accounting Requests (R1/R2)
  RECEPTION_ACCOUNTING_SUBMIT: 'reception:accounting:submit',
  RECEPTION_ACCOUNTING_VIEW: 'reception:accounting:view',

  // Reception — Legal Requests (R3)
  RECEPTION_LEGAL_SUBMIT: 'reception:legal:submit',
  RECEPTION_LEGAL_VIEW: 'reception:legal:view',

  // Legal Team (standalone dashboard, R3a)
  LEGAL_REQUESTS_VIEW_ALL: 'legal_requests:view_all',
  LEGAL_REQUESTS_MANAGE: 'legal_requests:manage',

  // Reception — Maintenance (R4)
  RECEPTION_MAINTENANCE_REPORT: 'reception:maintenance:report',
  RECEPTION_MAINTENANCE_VIEW: 'reception:maintenance:view',
  MAINTENANCE_VIEW_ALL: 'maintenance:view_all',
  MAINTENANCE_MANAGE: 'maintenance:manage',

  // Reception — Shifts (R5)
  RECEPTION_SHIFTS_VIEW: 'reception:shifts:view',

  // Operator Switch (R6a)
  OPERATOR_PIN_MANAGE: 'operator:pin:manage',       // Admin: reset others' PINs
  OPERATOR_SWITCH_AUDIT: 'operator:switch:audit',    // View switch logs

  // Reception — Cash Management
  RECEPTION_CASH_VIEW: 'reception:cash:view',
  RECEPTION_CASH_SETTINGS: 'reception:cash:settings',
  RECEPTION_CASH_TRANSFER: 'reception:cash:transfer',
  RECEPTION_CASH_DIVIDEND_REQUEST: 'reception:cash:dividend:request',
  RECEPTION_CASH_DIVIDEND_APPROVE: 'reception:cash:dividend:approve',

  // Metronome Sync
  METRONOME_VIEW: 'metronome:view',
  METRONOME_EDIT_OWN: 'metronome:edit_own',
  METRONOME_EDIT_ALL: 'metronome:edit_all',
  METRONOME_CREATE: 'metronome:create',
  METRONOME_RUN_MEETING: 'metronome:run_meeting',
  METRONOME_MANAGE_DATES: 'metronome:manage_dates',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role hierarchy (higher level = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  general_manager: 100,
  ceo: 95,
  chief_accountant: 80,
  hr: 75,
  accountant: 70,
  legal_manager: 65,
  reports_manager: 62,
  branch_manager: 60,
  recruiter: 50,
  employee: 10,
  reception_kiosk: 5,
};

// Permission sets for each role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  general_manager: [
    // Full access to everything
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.EMPLOYEES_VIEW_ALL,
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_EDIT,
    PERMISSIONS.EMPLOYEES_DELETE,
    PERMISSIONS.EMPLOYEES_VIEW_SALARY,
    PERMISSIONS.EMPLOYEES_EDIT_SALARY,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW_ALL,
    PERMISSIONS.ATTENDANCE_EDIT,
    PERMISSIONS.ATTENDANCE_EXPORT,
    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.BRANCHES_CREATE,
    PERMISSIONS.BRANCHES_EDIT,
    PERMISSIONS.BRANCHES_DELETE,
    PERMISSIONS.BRANCHES_MANAGE_GEOFENCE,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_VIEW_ALL,
    PERMISSIONS.PAYROLL_PROCESS,
    PERMISSIONS.PAYROLL_APPROVE,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_ANALYTICS,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_ASSIGN,
    PERMISSIONS.TASKS_DELETE,
    PERMISSIONS.RECRUITMENT_VIEW,
    PERMISSIONS.RECRUITMENT_MANAGE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_ASSIGN_ROLES,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_ADMIN,
    PERMISSIONS.FEEDBACK_SUBMIT,
    PERMISSIONS.FEEDBACK_VIEW_ALL,
    // Accounting - Full access including high-value approvals
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL,
    PERMISSIONS.ACCOUNTING_REQUESTS_CREATE,
    PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_HIGH,
    PERMISSIONS.ACCOUNTING_REQUESTS_REPORTS,
    // Telegram Bot - Full access
    PERMISSIONS.TELEGRAM_BOT_VIEW,
    PERMISSIONS.TELEGRAM_BOT_EDIT,
    // Finance - Full access
    PERMISSIONS.FINANCES_VIEW,
    PERMISSIONS.FINANCES_VIEW_ALL,
    PERMISSIONS.FINANCES_EDIT,
    PERMISSIONS.FINANCES_EXPORT,
    // Reception - Full access
    PERMISSIONS.RECEPTION_VIEW,
    PERMISSIONS.RECEPTION_TRANSACTIONS_CREATE,
    PERMISSIONS.RECEPTION_TRANSACTIONS_VIEW,
    PERMISSIONS.RECEPTION_TRANSACTIONS_EDIT,
    PERMISSIONS.RECEPTION_TRANSACTIONS_VOID,
    PERMISSIONS.RECEPTION_EXPENSES_CREATE,
    PERMISSIONS.RECEPTION_EXPENSES_VIEW,
    PERMISSIONS.RECEPTION_EXPENSES_EDIT,
    PERMISSIONS.RECEPTION_EXPENSES_VOID,
    PERMISSIONS.RECEPTION_ADMIN,
    PERMISSIONS.RECEPTION_REPORTS,
    // Shift Planning - Full access
    PERMISSIONS.SHIFTS_VIEW,
    PERMISSIONS.SHIFTS_VIEW_ALL,
    PERMISSIONS.SHIFTS_EDIT,
    PERMISSIONS.SHIFTS_PUBLISH,
    PERMISSIONS.SHIFTS_MANAGE_REQUIREMENTS,
    // Reception v2 — Full access
    PERMISSIONS.RECEPTION_ACCOUNTING_SUBMIT,
    PERMISSIONS.RECEPTION_ACCOUNTING_VIEW,
    PERMISSIONS.RECEPTION_LEGAL_SUBMIT,
    PERMISSIONS.RECEPTION_LEGAL_VIEW,
    PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL,
    PERMISSIONS.LEGAL_REQUESTS_MANAGE,
    PERMISSIONS.RECEPTION_MAINTENANCE_REPORT,
    PERMISSIONS.RECEPTION_MAINTENANCE_VIEW,
    PERMISSIONS.MAINTENANCE_VIEW_ALL,
    PERMISSIONS.MAINTENANCE_MANAGE,
    PERMISSIONS.RECEPTION_SHIFTS_VIEW,
    PERMISSIONS.OPERATOR_PIN_MANAGE,
    PERMISSIONS.OPERATOR_SWITCH_AUDIT,
    // Cash Management - Full access
    PERMISSIONS.RECEPTION_CASH_VIEW,
    PERMISSIONS.RECEPTION_CASH_SETTINGS,
    PERMISSIONS.RECEPTION_CASH_TRANSFER,
    PERMISSIONS.RECEPTION_CASH_DIVIDEND_REQUEST,
    PERMISSIONS.RECEPTION_CASH_DIVIDEND_APPROVE,
    // Metronome Sync - Full access
    PERMISSIONS.METRONOME_VIEW,
    PERMISSIONS.METRONOME_EDIT_OWN,
    PERMISSIONS.METRONOME_EDIT_ALL,
    PERMISSIONS.METRONOME_CREATE,
    PERMISSIONS.METRONOME_RUN_MEETING,
    PERMISSIONS.METRONOME_MANAGE_DATES,
  ],

  ceo: [
    // View access to everything, limited edit
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.EMPLOYEES_VIEW_ALL,
    PERMISSIONS.EMPLOYEES_VIEW_SALARY,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW_ALL,
    PERMISSIONS.ATTENDANCE_EXPORT,
    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_VIEW_ALL,
    PERMISSIONS.PAYROLL_APPROVE,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_ANALYTICS,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.RECRUITMENT_VIEW,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_ADMIN,
    PERMISSIONS.FEEDBACK_SUBMIT,
    PERMISSIONS.FEEDBACK_VIEW_ALL,
    // Accounting - View all, create own, approve high-value
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL,
    PERMISSIONS.ACCOUNTING_REQUESTS_CREATE,
    PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_HIGH,
    PERMISSIONS.ACCOUNTING_REQUESTS_REPORTS,
    // Finance - View all and approve
    PERMISSIONS.FINANCES_VIEW,
    PERMISSIONS.FINANCES_VIEW_ALL,
    PERMISSIONS.FINANCES_EXPORT,
    // Reception - View all
    PERMISSIONS.RECEPTION_VIEW,
    PERMISSIONS.RECEPTION_TRANSACTIONS_VIEW,
    PERMISSIONS.RECEPTION_EXPENSES_VIEW,
    PERMISSIONS.RECEPTION_REPORTS,
    // Shift Planning - View all
    PERMISSIONS.SHIFTS_VIEW,
    PERMISSIONS.SHIFTS_VIEW_ALL,
    // Reception v2 — View access
    PERMISSIONS.RECEPTION_ACCOUNTING_VIEW,
    PERMISSIONS.RECEPTION_LEGAL_VIEW,
    PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL,
    PERMISSIONS.RECEPTION_MAINTENANCE_VIEW,
    PERMISSIONS.MAINTENANCE_VIEW_ALL,
    PERMISSIONS.RECEPTION_SHIFTS_VIEW,
    PERMISSIONS.OPERATOR_SWITCH_AUDIT,
    // Cash Management - View only
    PERMISSIONS.RECEPTION_CASH_VIEW,
    // Metronome Sync - View + edit own + run meeting + manage dates
    PERMISSIONS.METRONOME_VIEW,
    PERMISSIONS.METRONOME_EDIT_OWN,
    PERMISSIONS.METRONOME_RUN_MEETING,
    PERMISSIONS.METRONOME_MANAGE_DATES,
  ],

  hr: [
    // Employee and HR operations
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.EMPLOYEES_VIEW_ALL,
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_EDIT,
    PERMISSIONS.EMPLOYEES_VIEW_SALARY,
    PERMISSIONS.EMPLOYEES_EDIT_SALARY,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW_ALL,
    PERMISSIONS.ATTENDANCE_EDIT,
    PERMISSIONS.ATTENDANCE_EXPORT,
    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.BRANCHES_EDIT,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_VIEW_ALL,
    PERMISSIONS.PAYROLL_PROCESS,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_ASSIGN,
    PERMISSIONS.RECRUITMENT_VIEW,
    PERMISSIONS.RECRUITMENT_MANAGE,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEEDBACK_SUBMIT,
    // Accounting - Create and manage own requests
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_CREATE,
    PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN,
    // Shift Planning - Full access
    PERMISSIONS.SHIFTS_VIEW,
    PERMISSIONS.SHIFTS_VIEW_ALL,
    PERMISSIONS.SHIFTS_EDIT,
    PERMISSIONS.SHIFTS_PUBLISH,
    PERMISSIONS.SHIFTS_MANAGE_REQUIREMENTS,
    // Metronome Sync - View + edit own
    PERMISSIONS.METRONOME_VIEW,
    PERMISSIONS.METRONOME_EDIT_OWN,
  ],

  branch_manager: [
    // Branch-level access - can view and manage their own branch
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW_ALL, // For their branch only
    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.LEAVE_APPROVE, // For their branch employees
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEEDBACK_SUBMIT,
    // Finance - View and create for their branch
    PERMISSIONS.FINANCES_VIEW,
    PERMISSIONS.FINANCES_EXPORT,
    // Accounting - Create and manage own requests
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_CREATE,
    PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN,
    // Reception - Operational access for their branch (RECEPTION_ADMIN removed — CSN-028: GM only)
    PERMISSIONS.RECEPTION_VIEW,
    PERMISSIONS.RECEPTION_TRANSACTIONS_CREATE,
    PERMISSIONS.RECEPTION_TRANSACTIONS_VIEW,
    PERMISSIONS.RECEPTION_TRANSACTIONS_EDIT,
    PERMISSIONS.RECEPTION_TRANSACTIONS_VOID,
    PERMISSIONS.RECEPTION_EXPENSES_CREATE,
    PERMISSIONS.RECEPTION_EXPENSES_VIEW,
    PERMISSIONS.RECEPTION_EXPENSES_EDIT,
    PERMISSIONS.RECEPTION_EXPENSES_VOID,
    PERMISSIONS.RECEPTION_REPORTS,
    // Shift Planning - Own branch only
    PERMISSIONS.SHIFTS_VIEW,
    PERMISSIONS.SHIFTS_EDIT_OWN_BRANCH,
    // Reception v2 — Branch-level access
    PERMISSIONS.RECEPTION_ACCOUNTING_SUBMIT,
    PERMISSIONS.RECEPTION_ACCOUNTING_VIEW,
    PERMISSIONS.RECEPTION_LEGAL_SUBMIT,
    PERMISSIONS.RECEPTION_LEGAL_VIEW,
    PERMISSIONS.RECEPTION_MAINTENANCE_REPORT,
    PERMISSIONS.RECEPTION_MAINTENANCE_VIEW,
    PERMISSIONS.RECEPTION_SHIFTS_VIEW,
    // Cash Management - View + request dividend (RECEPTION_CASH_SETTINGS removed — CSN-028: GM only)
    PERMISSIONS.RECEPTION_CASH_VIEW,
    PERMISSIONS.RECEPTION_CASH_DIVIDEND_REQUEST,
    // Metronome Sync - View + edit own
    PERMISSIONS.METRONOME_VIEW,
    PERMISSIONS.METRONOME_EDIT_OWN,
  ],

  recruiter: [
    // Recruitment focused
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.RECRUITMENT_VIEW,
    PERMISSIONS.RECRUITMENT_MANAGE,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEEDBACK_SUBMIT,
    // Accounting - Create and manage own requests
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_CREATE,
    PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN,
  ],

  employee: [
    // Own data only
    PERMISSIONS.EMPLOYEES_VIEW, // Own profile
    PERMISSIONS.ATTENDANCE_VIEW, // Own attendance
    PERMISSIONS.LEAVE_VIEW, // Own leave
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.TASKS_VIEW, // Own tasks
    PERMISSIONS.PAYROLL_VIEW, // Own payslips
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEEDBACK_SUBMIT,
    // Accounting - Create and manage own requests
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_CREATE,
    PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN,
    // Shift Planning - View own schedule
    PERMISSIONS.SHIFTS_VIEW,
    // Reception v2 — Report and view
    PERMISSIONS.RECEPTION_MAINTENANCE_REPORT,
    PERMISSIONS.RECEPTION_MAINTENANCE_VIEW,
    PERMISSIONS.RECEPTION_SHIFTS_VIEW,
  ],

  chief_accountant: [
    // Full accounting access + approve standard payments
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEEDBACK_SUBMIT,
    // Accounting
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL,
    PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS,
    PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD,
    PERMISSIONS.ACCOUNTING_REQUESTS_REPORTS,
    // Finance - Full access
    PERMISSIONS.FINANCES_VIEW,
    PERMISSIONS.FINANCES_VIEW_ALL,
    PERMISSIONS.FINANCES_EDIT,
    PERMISSIONS.FINANCES_EXPORT,
    // Reception - View and reports
    PERMISSIONS.RECEPTION_VIEW,
    PERMISSIONS.RECEPTION_TRANSACTIONS_VIEW,
    PERMISSIONS.RECEPTION_EXPENSES_VIEW,
    PERMISSIONS.RECEPTION_REPORTS,
    // Cash Management - View
    PERMISSIONS.RECEPTION_CASH_VIEW,
    // Reception v2 — Accounting view
    PERMISSIONS.RECEPTION_ACCOUNTING_VIEW,
  ],

  accountant: [
    // Process accounting requests, no approval
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEEDBACK_SUBMIT,
    // Accounting
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL,
    PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS,
    PERMISSIONS.ACCOUNTING_REQUESTS_REPORTS,
    // Finance - View all, create, edit
    PERMISSIONS.FINANCES_VIEW,
    PERMISSIONS.FINANCES_VIEW_ALL,
    PERMISSIONS.FINANCES_EDIT,
    PERMISSIONS.FINANCES_EXPORT,
    // Reception - View and reports
    PERMISSIONS.RECEPTION_VIEW,
    PERMISSIONS.RECEPTION_TRANSACTIONS_VIEW,
    PERMISSIONS.RECEPTION_EXPENSES_VIEW,
    PERMISSIONS.RECEPTION_REPORTS,
  ],

  legal_manager: [
    // Create and manage own accounting requests
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEEDBACK_SUBMIT,
    // Accounting
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_CREATE,
    PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN,
    // Reception v2 — Legal management
    PERMISSIONS.RECEPTION_LEGAL_VIEW,
    PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL,
    PERMISSIONS.LEGAL_REQUESTS_MANAGE,
  ],

  reports_manager: [
    // Finance and reports access
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEEDBACK_SUBMIT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    // View accounting reports
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_REPORTS,
    // Finance - View all and export
    PERMISSIONS.FINANCES_VIEW,
    PERMISSIONS.FINANCES_VIEW_ALL,
    PERMISSIONS.FINANCES_EXPORT,
  ],

  reception_kiosk: [
    // Reception-only access for standalone kiosk mode
    PERMISSIONS.RECEPTION_VIEW,
    PERMISSIONS.RECEPTION_TRANSACTIONS_CREATE,
    PERMISSIONS.RECEPTION_TRANSACTIONS_VIEW,
    PERMISSIONS.RECEPTION_TRANSACTIONS_EDIT,
    PERMISSIONS.RECEPTION_TRANSACTIONS_VOID,
    PERMISSIONS.RECEPTION_EXPENSES_CREATE,
    PERMISSIONS.RECEPTION_EXPENSES_VIEW,
    PERMISSIONS.RECEPTION_EXPENSES_EDIT,
    PERMISSIONS.RECEPTION_EXPENSES_VOID,
    PERMISSIONS.RECEPTION_REPORTS,
    PERMISSIONS.RECEPTION_ACCOUNTING_SUBMIT,
    PERMISSIONS.RECEPTION_ACCOUNTING_VIEW,
    PERMISSIONS.RECEPTION_LEGAL_SUBMIT,
    PERMISSIONS.RECEPTION_LEGAL_VIEW,
    PERMISSIONS.RECEPTION_MAINTENANCE_REPORT,
    PERMISSIONS.RECEPTION_MAINTENANCE_VIEW,
    PERMISSIONS.RECEPTION_SHIFTS_VIEW,
    // Cash Management - View + request dividend
    PERMISSIONS.RECEPTION_CASH_VIEW,
    PERMISSIONS.RECEPTION_CASH_DIVIDEND_REQUEST,
  ],
};

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Check if a role has any of the given permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

// Check if a role has all of the given permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

// Check if one role can manage another (based on hierarchy)
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

// Get all permissions for a role
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// Get human-readable role label
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    general_manager: 'General Manager',
    ceo: 'CEO',
    chief_accountant: 'Chief Accountant',
    accountant: 'Accountant',
    hr: 'HR Manager',
    legal_manager: 'Legal Manager',
    reports_manager: 'Reports Manager',
    branch_manager: 'Branch Manager',
    recruiter: 'Recruiter',
    employee: 'Employee',
    reception_kiosk: 'ServiceHub Kiosk',
  };
  return labels[role] ?? role;
}

// Get role badge color
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    general_manager: 'bg-purple-100 text-purple-800 border-purple-200',
    ceo: 'bg-amber-100 text-amber-800 border-amber-200',
    chief_accountant: 'bg-teal-100 text-teal-800 border-teal-200',
    accountant: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    hr: 'bg-blue-100 text-blue-800 border-blue-200',
    legal_manager: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    reports_manager: 'bg-orange-100 text-orange-800 border-orange-200',
    branch_manager: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    recruiter: 'bg-green-100 text-green-800 border-green-200',
    employee: 'bg-gray-100 text-gray-800 border-gray-200',
    reception_kiosk: 'bg-violet-100 text-violet-800 border-violet-200',
  };
  return colors[role] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

// Get all available roles
export function getAllRoles(): UserRole[] {
  return ['general_manager', 'ceo', 'chief_accountant', 'accountant', 'hr', 'legal_manager', 'reports_manager', 'branch_manager', 'recruiter', 'employee'];
}

// Permission groups for UI display
export const PERMISSION_GROUPS = {
  'Employee Management': [
    { key: PERMISSIONS.EMPLOYEES_VIEW, label: 'View Employees' },
    { key: PERMISSIONS.EMPLOYEES_VIEW_ALL, label: 'View All Employees' },
    { key: PERMISSIONS.EMPLOYEES_CREATE, label: 'Create Employees' },
    { key: PERMISSIONS.EMPLOYEES_EDIT, label: 'Edit Employees' },
    { key: PERMISSIONS.EMPLOYEES_DELETE, label: 'Delete Employees' },
    { key: PERMISSIONS.EMPLOYEES_VIEW_SALARY, label: 'View Salaries' },
    { key: PERMISSIONS.EMPLOYEES_EDIT_SALARY, label: 'Edit Salaries' },
  ],
  'Attendance': [
    { key: PERMISSIONS.ATTENDANCE_VIEW, label: 'View Attendance' },
    { key: PERMISSIONS.ATTENDANCE_VIEW_ALL, label: 'View All Attendance' },
    { key: PERMISSIONS.ATTENDANCE_EDIT, label: 'Edit Attendance' },
    { key: PERMISSIONS.ATTENDANCE_EXPORT, label: 'Export Attendance' },
  ],
  'Branches': [
    { key: PERMISSIONS.BRANCHES_VIEW, label: 'View Branches' },
    { key: PERMISSIONS.BRANCHES_CREATE, label: 'Create Branches' },
    { key: PERMISSIONS.BRANCHES_EDIT, label: 'Edit Branches' },
    { key: PERMISSIONS.BRANCHES_DELETE, label: 'Delete Branches' },
    { key: PERMISSIONS.BRANCHES_MANAGE_GEOFENCE, label: 'Manage Geofence' },
  ],
  'Payroll': [
    { key: PERMISSIONS.PAYROLL_VIEW, label: 'View Own Payroll' },
    { key: PERMISSIONS.PAYROLL_VIEW_ALL, label: 'View All Payroll' },
    { key: PERMISSIONS.PAYROLL_PROCESS, label: 'Process Payroll' },
    { key: PERMISSIONS.PAYROLL_APPROVE, label: 'Approve Payroll' },
  ],
  'Leave Management': [
    { key: PERMISSIONS.LEAVE_VIEW, label: 'View Leave' },
    { key: PERMISSIONS.LEAVE_REQUEST, label: 'Request Leave' },
    { key: PERMISSIONS.LEAVE_APPROVE, label: 'Approve Leave' },
    { key: PERMISSIONS.LEAVE_MANAGE, label: 'Manage Leave' },
  ],
  'Reports': [
    { key: PERMISSIONS.REPORTS_VIEW, label: 'View Reports' },
    { key: PERMISSIONS.REPORTS_EXPORT, label: 'Export Reports' },
    { key: PERMISSIONS.REPORTS_ANALYTICS, label: 'View Analytics' },
  ],
  'User Management': [
    { key: PERMISSIONS.USERS_VIEW, label: 'View Users' },
    { key: PERMISSIONS.USERS_CREATE, label: 'Create Users' },
    { key: PERMISSIONS.USERS_EDIT, label: 'Edit Users' },
    { key: PERMISSIONS.USERS_DELETE, label: 'Delete Users' },
    { key: PERMISSIONS.USERS_ASSIGN_ROLES, label: 'Assign Roles' },
  ],
  'Settings': [
    { key: PERMISSIONS.SETTINGS_VIEW, label: 'View Settings' },
    { key: PERMISSIONS.SETTINGS_EDIT, label: 'Edit Settings' },
  ],
  'Feedback': [
    { key: PERMISSIONS.FEEDBACK_SUBMIT, label: 'Submit Feedback' },
    { key: PERMISSIONS.FEEDBACK_VIEW_ALL, label: 'View All Feedback' },
  ],
  'Recruitment': [
    { key: PERMISSIONS.RECRUITMENT_VIEW, label: 'View Recruitment Pipeline' },
    { key: PERMISSIONS.RECRUITMENT_MANAGE, label: 'Manage Candidates' },
  ],
  'Finance': [
    { key: PERMISSIONS.FINANCES_VIEW, label: 'View Own Branch Finances' },
    { key: PERMISSIONS.FINANCES_VIEW_ALL, label: 'View All Branches Finances' },
    { key: PERMISSIONS.FINANCES_EDIT, label: 'Manage Profit Deals' },
    { key: PERMISSIONS.FINANCES_EXPORT, label: 'Export Finance Data' },
  ],
  'Accounting Requests': [
    { key: PERMISSIONS.ACCOUNTING_REQUESTS_VIEW, label: 'View Own Requests' },
    { key: PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL, label: 'View All Requests' },
    { key: PERMISSIONS.ACCOUNTING_REQUESTS_CREATE, label: 'Create Requests' },
    { key: PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN, label: 'Edit Own Requests' },
    { key: PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN, label: 'Cancel Own Requests' },
    { key: PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS, label: 'Process Requests' },
    { key: PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD, label: 'Approve 2M-10M UZS' },
    { key: PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_HIGH, label: 'Approve 10M+ UZS' },
    { key: PERMISSIONS.ACCOUNTING_REQUESTS_REPORTS, label: 'View Reports' },
  ],
  'ServiceHub': [
    { key: PERMISSIONS.RECEPTION_VIEW, label: 'Access Reception Mode' },
    { key: PERMISSIONS.RECEPTION_TRANSACTIONS_CREATE, label: 'Record Transactions' },
    { key: PERMISSIONS.RECEPTION_TRANSACTIONS_VIEW, label: 'View Transactions' },
    { key: PERMISSIONS.RECEPTION_TRANSACTIONS_EDIT, label: 'Edit Transactions' },
    { key: PERMISSIONS.RECEPTION_TRANSACTIONS_VOID, label: 'Void Transactions' },
    { key: PERMISSIONS.RECEPTION_EXPENSES_CREATE, label: 'Record Expenses' },
    { key: PERMISSIONS.RECEPTION_EXPENSES_VIEW, label: 'View Expenses' },
    { key: PERMISSIONS.RECEPTION_EXPENSES_EDIT, label: 'Edit Expenses' },
    { key: PERMISSIONS.RECEPTION_EXPENSES_VOID, label: 'Void Expenses' },
    { key: PERMISSIONS.RECEPTION_ADMIN, label: 'Admin Configuration' },
    { key: PERMISSIONS.RECEPTION_REPORTS, label: 'View Reports' },
    { key: PERMISSIONS.RECEPTION_ACCOUNTING_SUBMIT, label: 'Submit Accounting Requests' },
    { key: PERMISSIONS.RECEPTION_ACCOUNTING_VIEW, label: 'View Accounting Requests' },
    { key: PERMISSIONS.RECEPTION_SHIFTS_VIEW, label: 'View Shift Schedule' },
  ],
  'Legal Requests': [
    { key: PERMISSIONS.RECEPTION_LEGAL_SUBMIT, label: 'Submit Legal Requests' },
    { key: PERMISSIONS.RECEPTION_LEGAL_VIEW, label: 'View Own Legal Requests' },
    { key: PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL, label: 'View All Legal Requests' },
    { key: PERMISSIONS.LEGAL_REQUESTS_MANAGE, label: 'Manage Legal Requests' },
  ],
  'Maintenance': [
    { key: PERMISSIONS.RECEPTION_MAINTENANCE_REPORT, label: 'Report Issues' },
    { key: PERMISSIONS.RECEPTION_MAINTENANCE_VIEW, label: 'View Branch Issues' },
    { key: PERMISSIONS.MAINTENANCE_VIEW_ALL, label: 'View All Branches' },
    { key: PERMISSIONS.MAINTENANCE_MANAGE, label: 'Manage Issues' },
  ],
  'Operator Switch': [
    { key: PERMISSIONS.OPERATOR_PIN_MANAGE, label: 'Manage Employee PINs' },
    { key: PERMISSIONS.OPERATOR_SWITCH_AUDIT, label: 'View Switch Audit Logs' },
  ],
  'Cash Management': [
    { key: PERMISSIONS.RECEPTION_CASH_VIEW, label: 'View Cash Dashboard' },
    { key: PERMISSIONS.RECEPTION_CASH_SETTINGS, label: 'Manage Cash Settings' },
    { key: PERMISSIONS.RECEPTION_CASH_TRANSFER, label: 'Record Safe Transfers' },
    { key: PERMISSIONS.RECEPTION_CASH_DIVIDEND_REQUEST, label: 'Request Dividend Spend' },
    { key: PERMISSIONS.RECEPTION_CASH_DIVIDEND_APPROVE, label: 'Approve Dividend Spend' },
  ],
  'Metronome Sync': [
    { key: PERMISSIONS.METRONOME_VIEW, label: 'View Metronome Dashboard' },
    { key: PERMISSIONS.METRONOME_EDIT_OWN, label: 'Edit Own Initiatives' },
    { key: PERMISSIONS.METRONOME_EDIT_ALL, label: 'Edit All Initiatives' },
    { key: PERMISSIONS.METRONOME_CREATE, label: 'Create Initiatives' },
    { key: PERMISSIONS.METRONOME_RUN_MEETING, label: 'Run Sync Meeting' },
    { key: PERMISSIONS.METRONOME_MANAGE_DATES, label: 'Manage Key Dates' },
  ],
};
