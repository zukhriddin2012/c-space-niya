import { SignJWT, jwtVerify } from 'jose';
import type { User, UserRole } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'c-space-hr-secret-key-change-in-production'
);

// Demo users for development
export const DEMO_USERS: (User & { password: string })[] = [
  {
    id: '1',
    email: 'gm@cspace.uz',
    password: 'admin123',
    name: 'Zuhriddin Mahmudov',
    role: 'general_manager',
    department: 'Administration',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    email: 'ceo@cspace.uz',
    password: 'ceo123',
    name: 'CEO User',
    role: 'ceo',
    department: 'Executive',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    email: 'hr@cspace.uz',
    password: 'hr123',
    name: 'HR Manager',
    role: 'hr',
    department: 'Human Resources',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    email: 'recruiter@cspace.uz',
    password: 'recruiter123',
    name: 'Recruiter User',
    role: 'recruiter',
    department: 'Human Resources',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    email: 'employee@cspace.uz',
    password: 'employee123',
    name: 'Sample Employee',
    role: 'employee',
    employeeId: 'EMP-001',
    department: 'Operations',
    branchId: 'branch-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function createToken(user: User): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch {
    return null;
  }
}

export function validateCredentials(
  email: string,
  password: string
): User | null {
  const user = DEMO_USERS.find(
    (u) => u.email === email && u.password === password
  );
  if (!user) return null;
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Role-based permission helpers
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  general_manager: [
    'view_all_employees',
    'create_employee',
    'edit_employee',
    'delete_employee',
    'view_wages',
    'process_payroll',
    'view_budget',
    'manage_branches',
    'view_presence',
    'manage_users',
    'assign_tasks',
    'view_reports',
    'manage_settings',
  ],
  ceo: [
    'view_all_employees',
    'view_wages',
    'view_budget',
    'view_presence',
    'view_reports',
    'view_analytics',
  ],
  hr: [
    'view_all_employees',
    'create_employee',
    'edit_employee',
    'view_wages',
    'process_payroll',
    'view_presence',
    'assign_tasks',
    'manage_onboarding',
  ],
  recruiter: [
    'view_candidates',
    'manage_candidates',
    'view_presence',
    'view_hiring_pipeline',
  ],
  employee: [
    'view_own_profile',
    'view_own_tasks',
    'view_own_attendance',
    'view_own_payslips',
    'check_in_out',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    general_manager: 'General Manager',
    ceo: 'CEO',
    hr: 'HR Staff',
    recruiter: 'Recruiter',
    employee: 'Employee',
  };
  return labels[role];
}
