-- ============================================================================
-- DEV SUPABASE SETUP SCRIPT
-- Run this in Supabase SQL Editor to set up your dev database
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. BRANCHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default branches
INSERT INTO branches (id, name, address, latitude, longitude, geofence_radius) VALUES
  ('yunusabad', 'C-Space Yunusabad', 'Tashkent, Yunusabad district', 41.3775, 69.2856, 100),
  ('labzak', 'C-Space Labzak', 'Tashkent, Labzak district', 41.3280, 69.2756, 100),
  ('elbek', 'C-Space Elbek', 'Tashkent, Elbek district', 41.3100, 69.2800, 100),
  ('chust', 'C-Space Chust', 'Namangan region, Chust', 41.0000, 71.2333, 100),
  ('aero', 'CS Aero', 'Tashkent, near airport', 41.2575, 69.2808, 100),
  ('beruniy', 'C-Space Orient (Beruniy)', 'Tashkent, Beruniy district', 41.3200, 69.2200, 100),
  ('muqimiy', 'C-Space Muqimiy', 'Tashkent, Muqimiy district', 41.3050, 69.2650, 100),
  ('yandex', 'C-Space Yandex', 'Tashkent, Yandex location', 41.3110, 69.2790, 100)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. SHIFTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_hour INTEGER NOT NULL,
  end_hour INTEGER NOT NULL,
  late_threshold_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default shifts
INSERT INTO shifts (id, name, start_hour, end_hour, late_threshold_minutes) VALUES
  ('day', 'Day Shift', 9, 18, 15),
  ('night', 'Night Shift', 18, 9, 15),
  ('flexible', 'Flexible', 8, 20, 30)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  level TEXT DEFAULT 'junior',
  branch_id TEXT REFERENCES branches(id),
  salary DECIMAL(15, 2) DEFAULT 0,
  phone TEXT,
  email TEXT UNIQUE,
  telegram_id TEXT,
  default_shift TEXT REFERENCES shifts(id) DEFAULT 'day',
  can_rotate BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  employment_type TEXT DEFAULT 'full-time',
  hire_date DATE DEFAULT CURRENT_DATE,
  system_role TEXT DEFAULT 'employee',
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. ATTENDANCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_in_timestamp TIMESTAMP WITH TIME ZONE,
  check_in_branch_id TEXT REFERENCES branches(id),
  check_out TIME,
  check_out_timestamp TIMESTAMP WITH TIME ZONE,
  check_out_branch_id TEXT REFERENCES branches(id),
  shift_id TEXT REFERENCES shifts(id) DEFAULT 'day',
  status TEXT DEFAULT 'present',
  total_hours DECIMAL(4, 1),
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. LEAVE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. INSERT TEST EMPLOYEES
-- ============================================================================

-- General Manager (you)
INSERT INTO employees (employee_id, full_name, position, level, branch_id, email, password, system_role, status) VALUES
  ('EMP001', 'Zuxriddin Abduraxmonov', 'General Manager', 'executive', 'yunusabad', 'zuxriddin@cspace.uz', 'Test@2024', 'general_manager', 'active')
ON CONFLICT (employee_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  system_role = EXCLUDED.system_role;

-- HR Manager
INSERT INTO employees (employee_id, full_name, position, level, branch_id, email, password, system_role, status) VALUES
  ('EMP002', 'Nigina Umaraliyeva', 'HR Manager', 'senior', 'yunusabad', 'nigina@cspace.uz', 'Test@2024', 'hr', 'active')
ON CONFLICT (employee_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  system_role = EXCLUDED.system_role;

-- Branch Manager
INSERT INTO employees (employee_id, full_name, position, level, branch_id, email, password, system_role, status) VALUES
  ('EMP003', 'Said Yunusabad', 'Branch Manager', 'senior', 'yunusabad', 'said.yunusabad@cspace.uz', 'Test@2024', 'branch_manager', 'active')
ON CONFLICT (employee_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  system_role = EXCLUDED.system_role;

-- Community Manager
INSERT INTO employees (employee_id, full_name, position, level, branch_id, email, password, system_role, status) VALUES
  ('EMP004', 'Aziza Karimova', 'Community Manager', 'middle', 'yunusabad', 'aziza@cspace.uz', 'Test@2024', 'community_manager', 'active')
ON CONFLICT (employee_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  system_role = EXCLUDED.system_role;

-- Regular Employee
INSERT INTO employees (employee_id, full_name, position, level, branch_id, email, password, system_role, status) VALUES
  ('EMP005', 'Jamshid Toshmatov', 'Receptionist', 'junior', 'labzak', 'jamshid@cspace.uz', 'Test@2024', 'employee', 'active')
ON CONFLICT (employee_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  system_role = EXCLUDED.system_role;

-- Accountant
INSERT INTO employees (employee_id, full_name, position, level, branch_id, email, password, system_role, status) VALUES
  ('EMP006', 'Malika Rahimova', 'Accountant', 'middle', 'yunusabad', 'malika@cspace.uz', 'Test@2024', 'accountant', 'active')
ON CONFLICT (employee_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  system_role = EXCLUDED.system_role;

-- Recruiter
INSERT INTO employees (employee_id, full_name, position, level, branch_id, email, password, system_role, status) VALUES
  ('EMP007', 'Dilnoza Saidova', 'Recruiter', 'middle', 'yunusabad', 'dilnoza@cspace.uz', 'Test@2024', 'recruiter', 'active')
ON CONFLICT (employee_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  system_role = EXCLUDED.system_role;

-- Night Shift Employee
INSERT INTO employees (employee_id, full_name, position, level, branch_id, email, password, system_role, default_shift, status) VALUES
  ('EMP008', 'Bobur Alimov', 'Night Administrator', 'junior', 'yunusabad', 'bobur@cspace.uz', 'Test@2024', 'night_shift', 'night', 'active')
ON CONFLICT (employee_id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  system_role = EXCLUDED.system_role;

-- ============================================================================
-- 7. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_system_role ON employees(system_role);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- ============================================================================
-- DONE! You now have:
-- - 8 branches
-- - 3 shifts
-- - 8 test employees (one for each role)
--
-- All test accounts use password: Test@2024
-- ============================================================================
