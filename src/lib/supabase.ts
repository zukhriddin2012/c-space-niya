import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Log configuration status at startup (only once)
if (typeof window === 'undefined') {
  console.log('[SUPABASE] URL configured:', !!supabaseUrl);
  console.log('[SUPABASE] Anon key configured:', !!supabaseAnonKey);
  console.log('[SUPABASE] Service key configured:', !!supabaseServiceKey);
}

// Client-side Supabase client (limited permissions)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side Supabase client (full permissions)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const isSupabaseConfigured = () => !!supabase;
export const isSupabaseAdminConfigured = () => !!supabaseAdmin;

// Database types
export interface Branch {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius: number;
  office_ips?: string[] | null;
}

export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  position: string;
  level: string;
  branch_id: string | null;
  salary: number | null;
  phone: string | null;
  email: string | null;
  telegram_id: string | null;
  default_shift: string;
  can_rotate: boolean;
  status: string;
  employment_type: string; // 'full-time' | 'part-time' | 'internship' | 'probation'
  hire_date: string;
  system_role?: string; // Role for access control: general_manager, ceo, hr, branch_manager, recruiter, employee
  password?: string; // For authentication (demo only - use hashing in production)
  branches?: Branch;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_in_timestamp: string | null;
  check_in_branch_id: string | null;
  check_out: string | null;
  check_out_timestamp: string | null;
  check_out_branch_id: string | null;
  shift_id: string;
  status: string;
  total_hours: number | null;
  employees?: Employee;
  check_in_branch?: Branch;
  check_out_branch?: Branch;
  // Overnight/multi-day shift fields
  is_overnight?: boolean;
  overnight_from_date?: string;
  is_checkout_day?: boolean; // True when viewing the date this record was checked out (not checked in)
  // IP verification fields
  verification_type?: 'ip' | 'gps';
  ip_address?: string | null;
  source?: 'telegram' | 'web' | 'manual' | null;
}

export interface LeaveRequest {
  id: number;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  employees?: Employee;
}
