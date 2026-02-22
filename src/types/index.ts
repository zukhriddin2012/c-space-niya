// User roles for the HR platform
export type UserRole = 'general_manager' | 'ceo' | 'hr' | 'recruiter' | 'branch_manager' | 'employee' | 'accountant' | 'chief_accountant' | 'legal_manager' | 'reports_manager' | 'reception_kiosk' | 'sales_manager' | 'bd_manager';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  position?: string; // Job title (e.g., "General Manager", "Receptionist")
  employeeId?: string;
  department?: string;
  branchId?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EmployeeLevel = 'junior' | 'middle' | 'senior' | 'executive';

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  photo?: string;
  departmentId?: string;
  position: string;
  level: EmployeeLevel;
  branchId: string;
  branchLocation?: string; // Specific work location (e.g., Yunusabad, Muqimiy)
  startDate?: Date;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  baseSalary: number; // Bazaviy oylik in UZS
  advanceBank?: number; // Avans (Bank)
  advanceCash?: number; // Avans (Naqd)
  salaryBank?: number; // Oylik (Bank)
  salaryCash?: number; // Oylik (Naqd)
  bankAccount?: string;
  taxId?: string;
  telegramId?: string;
  notes?: string; // Any notes like "Will be fired from Nov."
  status: 'active' | 'inactive' | 'terminated' | 'probation';
  isGrowthTeam?: boolean; // Part of the Growth Team with access to strategic projects
  managerId?: string; // Direct manager for org chart hierarchy
  remoteWorkEnabled?: boolean; // Can check in remotely without GPS verification
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number; // in meters
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  id: string;
  employeeId: string;
  branchId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  checkInLat: number;
  checkInLng: number;
  checkOutLat?: number;
  checkOutLng?: number;
  status: 'present' | 'late' | 'absent' | 'early_leave';
  source: 'web' | 'telegram' | 'manual';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payroll {
  id: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  paymentDate?: Date;
  paymentMethod?: 'bank_transfer' | 'cash' | 'check';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  assignedById: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  category: 'onboarding' | 'general' | 'hr' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// Session and Auth types
export interface Session {
  user: User;
  accessToken: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  accessToken?: string;
}

// Dashboard specific types
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  lateToday: number;
  pendingPayroll: number;
  totalBranches: number;
}

export interface BranchPresence {
  branchId: string;
  branchName: string;
  presentCount: number;
  totalAssigned: number;
  employees: {
    id: string;
    name: string;
    position: string;
    checkInTime: Date;
    status: string;
  }[];
}
