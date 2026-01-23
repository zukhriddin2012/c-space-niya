-- ============================================================================
-- BASE SCHEMA FOR C-SPACE HR SYSTEM
-- Run this FIRST before running migrations
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
-- 2. LEGAL ENTITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  inn TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default legal entities
INSERT INTO legal_entities (id, name, inn) VALUES
  ('cspace_main', 'C-Space LLC', '123456789'),
  ('cspace_labzak', 'C-Space Labzak LLC', '234567890'),
  ('cspace_orient', 'C-Space Orient LLC', '345678901')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. SHIFTS TABLE
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
-- 4. EMPLOYEES TABLE
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
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'on_leave')),
  employment_type TEXT DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'internship', 'probation')),
  hire_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. ATTENDANCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_in_timestamp TIMESTAMP WITH TIME ZONE,
  check_in_branch_id TEXT REFERENCES branches(id),
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  check_out TIME,
  check_out_timestamp TIMESTAMP WITH TIME ZONE,
  check_out_branch_id TEXT REFERENCES branches(id),
  check_out_latitude DECIMAL(10, 8),
  check_out_longitude DECIMAL(11, 8),
  shift_id TEXT REFERENCES shifts(id) DEFAULT 'day',
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'late', 'early_leave', 'absent', 'on_leave')),
  total_hours DECIMAL(4, 1),
  source TEXT CHECK (source IN ('telegram', 'web', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. LEAVE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. EMPLOYEE WAGES TABLE (Primary/Bank wages)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_wages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  legal_entity_id TEXT REFERENCES legal_entities(id),
  wage_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  wage_type TEXT DEFAULT 'salary',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 8. PAYSLIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  gross_salary DECIMAL(15, 2) DEFAULT 0,
  net_salary DECIMAL(15, 2) DEFAULT 0,
  deductions DECIMAL(15, 2) DEFAULT 0,
  bonuses DECIMAL(15, 2) DEFAULT 0,
  working_days INTEGER DEFAULT 0,
  worked_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, year, month)
);

-- ============================================================================
-- 9. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ============================================================================
-- END OF BASE SCHEMA
-- ============================================================================
