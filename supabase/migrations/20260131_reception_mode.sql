-- Migration: Reception Mode - Phase 1: Foundation & Admin Configuration
-- Version: 1.0
-- Date: 2026-01-31
-- Description: Creates admin configuration tables (service_types, expense_types, payment_methods)
--              and main transaction/expense tables for Reception Mode

-- ============================================
-- 1. SERVICE TYPES TABLE (Admin-Configurable)
-- ============================================
CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,           -- Display name: "Meeting", "Day Pass"
  code VARCHAR(30) UNIQUE NOT NULL,    -- System code: "meeting", "day_pass"
  icon VARCHAR(10),                    -- Emoji icon: "👥", "🗓️"
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for service_types
CREATE INDEX idx_service_types_active ON service_types(is_active, sort_order);
CREATE INDEX idx_service_types_code ON service_types(code);

-- ============================================
-- 2. EXPENSE TYPES TABLE (Admin-Configurable)
-- ============================================
CREATE TABLE IF NOT EXISTS expense_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,           -- Display name: "Goods", "Utility"
  code VARCHAR(30) UNIQUE NOT NULL,    -- System code: "goods", "utility"
  icon VARCHAR(10),                    -- Emoji icon: "🛒", "⚡"
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for expense_types
CREATE INDEX idx_expense_types_active ON expense_types(is_active, sort_order);
CREATE INDEX idx_expense_types_code ON expense_types(code);

-- ============================================
-- 3. PAYMENT METHODS TABLE (Admin-Configurable)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,           -- Display name: "Cash", "Payme"
  code VARCHAR(30) UNIQUE NOT NULL,    -- System code: "cash", "payme"
  icon VARCHAR(10),                    -- Emoji icon: "💵", "📱"
  requires_code BOOLEAN DEFAULT FALSE, -- Whether transaction code is required
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for payment_methods
CREATE INDEX idx_payment_methods_active ON payment_methods(is_active, sort_order);
CREATE INDEX idx_payment_methods_code ON payment_methods(code);

-- ============================================
-- 4. TRANSACTIONS TABLE (Main - Replaces Google Sheet)
-- Tracks coworking service transactions
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number VARCHAR(20) UNIQUE NOT NULL, -- TXN-YYYYMM-XXXX (auto-generated)

  -- Customer Info
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),  -- Optional, for future loyalty tracking
  customer_company VARCHAR(255),

  -- Service Details (FK to configurable service_types)
  service_type_id UUID NOT NULL REFERENCES service_types(id),

  -- Payment Details (FK to configurable payment_methods)
  amount DECIMAL(15,2) NOT NULL,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  transaction_code VARCHAR(50),  -- Payme/Click/Uzum transaction codes

  -- Location & Agent
  branch_id VARCHAR NOT NULL REFERENCES branches(id),
  agent_id UUID NOT NULL REFERENCES employees(id),  -- Who recorded the transaction

  -- Notes
  notes TEXT,  -- Room numbers, periods, special notes

  -- Status (for voiding transactions)
  is_voided BOOLEAN DEFAULT FALSE,
  voided_at TIMESTAMP WITH TIME ZONE,
  voided_by UUID REFERENCES employees(id),
  void_reason TEXT,

  -- Timestamps
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_transactions_branch ON transactions(branch_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_agent ON transactions(agent_id);
CREATE INDEX idx_transactions_service ON transactions(service_type_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_name);
CREATE INDEX idx_transactions_method ON transactions(payment_method_id);
CREATE INDEX idx_transactions_number ON transactions(transaction_number);
CREATE INDEX idx_transactions_active ON transactions(is_voided, transaction_date DESC);

-- ============================================
-- 5. EXPENSES TABLE (Replaces "All Payments - LABZAK" Spreadsheet)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_number VARCHAR(20) UNIQUE NOT NULL, -- EXP-YYYYMM-XXXX (auto-generated)

  -- Expense Details (from spreadsheet)
  subject TEXT NOT NULL,  -- "Subject" column - vendor/description
  amount DECIMAL(15,2) NOT NULL,  -- "Price" column

  -- Type (FK to configurable expense_types)
  expense_type_id UUID NOT NULL REFERENCES expense_types(id),

  -- Payment Method (from "Comments" column: Cash or Bank)
  payment_method VARCHAR(10) NOT NULL CHECK (payment_method IN ('cash', 'bank')),

  -- Location & User
  branch_id VARCHAR NOT NULL REFERENCES branches(id),
  recorded_by UUID NOT NULL REFERENCES employees(id),

  -- Status (for voiding expenses)
  is_voided BOOLEAN DEFAULT FALSE,
  voided_at TIMESTAMP WITH TIME ZONE,
  voided_by UUID REFERENCES employees(id),
  void_reason TEXT,

  -- Timestamps
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for expenses
CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_type ON expenses(expense_type_id);
CREATE INDEX idx_expenses_method ON expenses(payment_method);
CREATE INDEX idx_expenses_subject ON expenses(subject);
CREATE INDEX idx_expenses_number ON expenses(expense_number);
CREATE INDEX idx_expenses_active ON expenses(is_voided, expense_date DESC);

-- ============================================
-- 6. SEQUENCE TABLES FOR AUTO-NUMBERING
-- ============================================
CREATE TABLE IF NOT EXISTS transaction_sequences (
  id SERIAL PRIMARY KEY,
  year_month VARCHAR(6) NOT NULL UNIQUE, -- YYYYMM
  last_number INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_sequences (
  id SERIAL PRIMARY KEY,
  year_month VARCHAR(6) NOT NULL UNIQUE, -- YYYYMM
  last_number INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. FUNCTION: Generate Transaction Number
-- ============================================
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  current_month TEXT;
  next_number INTEGER;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');

  -- Insert or update sequence
  INSERT INTO transaction_sequences (year_month, last_number, updated_at)
  VALUES (current_month, 1, NOW())
  ON CONFLICT (year_month)
  DO UPDATE SET
    last_number = transaction_sequences.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_number;

  NEW.transaction_number := 'TXN-' || current_month || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transaction_number
  BEFORE INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.transaction_number IS NULL)
  EXECUTE FUNCTION generate_transaction_number();

-- ============================================
-- 8. FUNCTION: Generate Expense Number
-- ============================================
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
DECLARE
  current_month TEXT;
  next_number INTEGER;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');

  -- Insert or update sequence
  INSERT INTO expense_sequences (year_month, last_number, updated_at)
  VALUES (current_month, 1, NOW())
  ON CONFLICT (year_month)
  DO UPDATE SET
    last_number = expense_sequences.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_number;

  NEW.expense_number := 'EXP-' || current_month || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_expense_number
  BEFORE INSERT ON expenses
  FOR EACH ROW
  WHEN (NEW.expense_number IS NULL)
  EXECUTE FUNCTION generate_expense_number();

-- ============================================
-- 9. TRIGGERS: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_reception_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_types_timestamp
  BEFORE UPDATE ON service_types
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_reception_timestamp();

CREATE TRIGGER update_expense_types_timestamp
  BEFORE UPDATE ON expense_types
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_reception_timestamp();

CREATE TRIGGER update_payment_methods_timestamp
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_reception_timestamp();

CREATE TRIGGER update_transactions_timestamp
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_reception_timestamp();

CREATE TRIGGER update_expenses_timestamp
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_reception_timestamp();

-- ============================================
-- 10. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all for authenticated users (we'll handle permissions in the app)
CREATE POLICY "Enable all for authenticated users" ON service_types
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON expense_types
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON payment_methods
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON transactions
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON expenses
  FOR ALL USING (true);

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON service_types TO authenticated;
GRANT ALL ON expense_types TO authenticated;
GRANT ALL ON payment_methods TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON transaction_sequences TO authenticated;
GRANT ALL ON expense_sequences TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE transaction_sequences_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE expense_sequences_id_seq TO authenticated;

-- ============================================
-- 12. SEED DATA: Service Types
-- ============================================
INSERT INTO service_types (name, code, icon, sort_order) VALUES
  ('Meeting', 'meeting', '👥', 1),
  ('Hour', 'hour', '🪑', 2),
  ('Day Pass', 'day_pass', '🗓️', 3),
  ('Conference', 'conference', '🎤', 4),
  ('Office', 'office', '🏢', 5),
  ('Dedicated', 'dedicated', '🖥️', 6),
  ('Flex', 'flex', '🔄', 7),
  ('Week Pass', 'weekpass', '📅', 8),
  ('15 Days', '15_days', '📆', 9),
  ('Demo', 'demo', '🎓', 10),
  ('Other', 'other', '📦', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 13. SEED DATA: Expense Types
-- ============================================
INSERT INTO expense_types (name, code, icon, sort_order) VALUES
  ('Goods', 'goods', '🛒', 1),
  ('Utility', 'utility', '⚡', 2),
  ('Staff', 'staff', '👷', 3),
  ('Tax', 'tax', '🧾', 4),
  ('Maintenance', 'maintenance', '🔧', 5),
  ('Marketing', 'marketing', '📢', 6),
  ('CapEx', 'capex', '🏗️', 7),
  ('Charity', 'charity', '❤️', 8),
  ('Other', 'other', '📦', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 14. SEED DATA: Payment Methods
-- ============================================
INSERT INTO payment_methods (name, code, icon, requires_code, sort_order) VALUES
  ('Cash', 'cash', '💵', FALSE, 1),
  ('Payme', 'payme', '📱', TRUE, 2),
  ('Click', 'click', '🖱️', TRUE, 3),
  ('Uzum', 'uzum', '🍇', TRUE, 4),
  ('Terminal', 'terminal', '💳', FALSE, 5),
  ('Bank', 'bank', '🏦', FALSE, 6)
ON CONFLICT (code) DO NOTHING;
