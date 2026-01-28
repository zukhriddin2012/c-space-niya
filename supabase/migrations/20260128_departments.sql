-- Departments Table
-- Organizational structure for employees

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(20) DEFAULT 'bg-gray-500', -- Tailwind color class for UI
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add department_id to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS departments_updated_at ON departments;
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_departments_updated_at();

-- Insert default departments based on typical C-Space structure
INSERT INTO departments (name, description, color) VALUES
  ('Operations', 'Day-to-day business operations and customer service', 'bg-blue-500'),
  ('Human Resources', 'Employee management, recruitment, and development', 'bg-purple-500'),
  ('Finance', 'Financial planning, accounting, and budgeting', 'bg-green-500'),
  ('Marketing', 'Brand management, advertising, and promotions', 'bg-orange-500'),
  ('IT & Development', 'Technology infrastructure and software development', 'bg-cyan-500'),
  ('Administration', 'Executive support and office management', 'bg-pink-500'),
  ('Legal', 'Legal affairs and compliance', 'bg-indigo-500'),
  ('Sales', 'Sales and business development', 'bg-yellow-500')
ON CONFLICT (name) DO NOTHING;
