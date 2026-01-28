import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

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
  // Branch configuration fields (optional for backwards compatibility)
  operational_status?: 'under_construction' | 'operational' | 'rented' | 'facility_management';
  has_night_shift?: boolean;
  smart_lock_enabled?: boolean;
  smart_lock_start_time?: string | null; // TIME format: "18:00"
  smart_lock_end_time?: string | null;   // TIME format: "09:00"
  branch_class?: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C';
  description?: string | null;
  community_manager_id?: string | null;
  // Joined data
  community_manager?: Employee;
}

export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  position: string;
  level: string;
  branch_id: string | null;
  department_id: string | null;
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
  preferred_language?: 'uz' | 'ru' | 'en'; // Language preference for bot messages
  branches?: Branch;
  departments?: Department;
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

export interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  manager?: Employee;
  employee_count?: number;
}

// ============================================
// TELEGRAM BOT CONTENT TYPES
// ============================================

export type SupportedLanguage = 'en' | 'ru' | 'uz';

export interface LocalizedContent {
  en: string;
  ru: string;
  uz: string;
}

// Learning content for checkout reminders
export interface BotLearningContent {
  id: string;
  type: 'tip' | 'scenario' | 'quiz' | 'reflection';
  category: 'service_excellence' | 'team_collaboration' | 'customer_handling' | 'company_values' | 'professional_growth';
  title: LocalizedContent;
  content: LocalizedContent;
  // For quiz type
  quiz_options?: LocalizedContent[];
  quiz_correct_index?: number;
  quiz_explanation?: LocalizedContent;
  // Metadata
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Message templates for bot communications
export interface BotMessageTemplate {
  id: string;
  key: string; // e.g., 'checkout_reminder', 'auto_checkout_notice', 'ip_mismatch_question'
  description: string;
  content: LocalizedContent;
  // Placeholders that can be used in the message (e.g., {employee_name}, {time})
  available_placeholders: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Button labels for bot interactions
export interface BotButtonLabel {
  id: string;
  key: string; // e.g., 'confirm_checkout', 'im_in_office', 'i_left'
  description: string;
  label: LocalizedContent;
  emoji?: string; // Optional emoji to prepend
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Bot settings/schedules
export interface BotSettings {
  id: string;
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

// Checkout reminder record
export interface CheckoutReminder {
  id: string;
  employee_id: string;
  attendance_id: string;
  shift_type: 'day' | 'night';
  reminder_sent_at: string | null;
  reminder_message_id: string | null;
  learning_content_id: string | null;
  response_received_at: string | null;
  response_type: 'confirmed' | 'in_office' | 'left' | 'auto' | null;
  ip_verified: boolean;
  ip_address: string | null;
  auto_checkout_at: string | null;
  status: 'pending' | 'sent' | 'responded' | 'auto_completed';
  created_at: string;
}
