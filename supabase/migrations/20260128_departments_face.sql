-- Add FACe fields to existing departments table
-- This migration adds category, accountable_person, and display_order columns

-- Create the face_category enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'face_category') THEN
        CREATE TYPE face_category AS ENUM (
          'executive',
          'growth',
          'support',
          'operations',
          'specialized'
        );
    END IF;
END $$;

-- Add new columns to departments table
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS category face_category DEFAULT 'operations',
ADD COLUMN IF NOT EXISTS accountable_person_id UUID REFERENCES employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Drop old varchar column if it exists
ALTER TABLE departments DROP COLUMN IF EXISTS accountable_person;

-- Delete existing generic departments to replace with FACe structure
DELETE FROM departments WHERE name IN (
  'Operations', 'Human Resources', 'Finance', 'Marketing',
  'IT & Development', 'Administration', 'Legal', 'Sales'
);

-- Insert C-Space FACe (Function Accountability Chart) - 14 Functions
-- Based on C-Space Strategy Reference Document V2.4
-- Note: accountable_person_id should be set manually after migration by linking to actual employee records
INSERT INTO departments (name, description, color, category, display_order) VALUES
  -- Executive Leadership
  ('CEO', 'Chief Executive Officer - Overall company leadership and vision', 'bg-slate-800', 'executive', 1),
  ('COO', 'Chief Operating Officer - Day-to-day operations management', 'bg-slate-700', 'executive', 2),
  ('CFO', 'Chief Financial Officer - Financial strategy and management', 'bg-green-600', 'executive', 3),

  -- Business Growth Functions
  ('Business Development & Expansion', 'New partnerships, expansion strategy, growth initiatives', 'bg-blue-600', 'growth', 1),
  ('Sales Management', 'Sales strategy, revenue generation, client acquisition', 'bg-yellow-500', 'growth', 2),
  ('Marketing Management', 'Brand management, advertising, lead generation', 'bg-orange-500', 'growth', 3),

  -- Support Functions
  ('HR', 'Human Resources - Recruitment, employee relations, development', 'bg-purple-500', 'support', 1),
  ('Legal Management', 'Legal affairs, contracts, compliance', 'bg-indigo-500', 'support', 2),

  -- Operations Functions
  ('Experience Management', 'Branch Managers (BM), Night Shift (NS), Community Managers (CM) - Member experience and service quality', 'bg-pink-500', 'operations', 1),
  ('Internal Facility Management', 'Internal C-Space facilities, maintenance, operations', 'bg-cyan-500', 'operations', 2),
  ('External Facility Management', 'AXOs for Yandex and external client facility services', 'bg-teal-500', 'operations', 3),

  -- Specialized Functions
  ('Technology Management', 'IT infrastructure, software, digital solutions', 'bg-violet-500', 'specialized', 1),
  ('Construction & Launch Management', 'New location construction, facility launches', 'bg-amber-600', 'specialized', 2),
  ('VC', 'Venture Capital - Investment strategy and portfolio management', 'bg-emerald-600', 'specialized', 3)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order;
