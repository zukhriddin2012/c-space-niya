-- Positions Table
-- Job positions/titles for employees

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  name_uz VARCHAR(100), -- Uzbek translation
  name_ru VARCHAR(100), -- Russian translation
  description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL, -- Default department for this position
  level VARCHAR(50), -- e.g., Junior, Middle, Senior, Lead, Manager
  min_salary DECIMAL(12, 2), -- Minimum salary range
  max_salary DECIMAL(12, 2), -- Maximum salary range
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS positions_updated_at ON positions;
CREATE TRIGGER positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_positions_updated_at();

-- Add position_id to employees table (keeping position varchar for backwards compatibility)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id) ON DELETE SET NULL;

-- Insert C-Space positions based on FACe structure
INSERT INTO positions (name, name_uz, name_ru, description, level) VALUES
  -- Executive positions
  ('CEO', 'Bosh direktor', 'Генеральный директор', 'Chief Executive Officer', 'Executive'),
  ('COO', 'Operatsion direktor', 'Операционный директор', 'Chief Operating Officer', 'Executive'),
  ('CFO', 'Moliya direktori', 'Финансовый директор', 'Chief Financial Officer', 'Executive'),

  -- Management positions
  ('Branch Manager', 'Filial menejeri', 'Менеджер филиала', 'Manages a C-Space branch location', 'Manager'),
  ('Community Manager', 'Hamjamiyat menejeri', 'Комьюнити менеджер', 'Manages community and member experience', 'Manager'),
  ('HR Manager', 'HR menejer', 'HR менеджер', 'Human Resources Manager', 'Manager'),
  ('Sales Manager', 'Sotuv menejeri', 'Менеджер по продажам', 'Sales department manager', 'Manager'),
  ('Marketing Manager', 'Marketing menejeri', 'Маркетинг менеджер', 'Marketing department manager', 'Manager'),

  -- Specialist positions
  ('Night Shift Specialist', 'Tungi smena mutaxassisi', 'Специалист ночной смены', 'Night shift operations specialist', 'Specialist'),
  ('AXO Specialist', 'AXO mutaxassisi', 'Специалист АХО', 'Administrative and facilities specialist', 'Specialist'),
  ('HR Specialist', 'HR mutaxassisi', 'HR специалист', 'Human Resources specialist', 'Specialist'),
  ('Accountant', 'Buxgalter', 'Бухгалтер', 'Financial accounting specialist', 'Specialist'),
  ('Legal Specialist', 'Yurist', 'Юрист', 'Legal affairs specialist', 'Specialist'),
  ('IT Specialist', 'IT mutaxassisi', 'IT специалист', 'Information technology specialist', 'Specialist'),
  ('Marketing Specialist', 'Marketing mutaxassisi', 'Маркетинг специалист', 'Marketing specialist', 'Specialist'),
  ('Sales Specialist', 'Sotuv mutaxassisi', 'Специалист по продажам', 'Sales specialist', 'Specialist'),

  -- Support positions
  ('Receptionist', 'Qabulxona xodimi', 'Ресепшионист', 'Front desk and reception', 'Support'),
  ('Cleaner', 'Tozalovchi', 'Уборщик', 'Cleaning and maintenance staff', 'Support'),
  ('Security', 'Qorovul', 'Охранник', 'Security personnel', 'Support'),

  -- Intern positions
  ('HR Intern', 'HR stajer', 'HR стажер', 'Human Resources intern', 'Intern'),
  ('Marketing Intern', 'Marketing stajer', 'Маркетинг стажер', 'Marketing intern', 'Intern'),
  ('Sales Intern', 'Sotuv stajeri', 'Стажер по продажам', 'Sales intern', 'Intern')
ON CONFLICT (name) DO UPDATE SET
  name_uz = EXCLUDED.name_uz,
  name_ru = EXCLUDED.name_ru,
  description = EXCLUDED.description,
  level = EXCLUDED.level;
