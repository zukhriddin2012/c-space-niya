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
    // Accounting - Create and manage own requests
    PERMISSIONS.ACCOUNTING_REQUESTS_VIEW,
    PERMISSIONS.ACCOUNTING_REQUESTS_CREATE,
    PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN,
    PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN,
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
    branch_manager: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    recruiter: 'bg-green-100 text-green-800 border-green-200',
    employee: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return colors[role] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

// Get all available roles
export function getAllRoles(): UserRole[] {
  return ['general_manager', 'ceo', 'chief_accountant', 'accountant', 'hr', 'legal_manager', 'branch_manager', 'recruiter', 'employee'];
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
};
