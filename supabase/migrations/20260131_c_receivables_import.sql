-- ============================================
-- Receivables (Debt) Table and Historical Import
-- C-Space Labzak Historical Debts
-- ============================================

-- Create receivables table for tracking outstanding payments
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Client Info
  customer_name VARCHAR(255) NOT NULL,
  client_id UUID REFERENCES clients(id),

  -- Amount Details
  amount DECIMAL(15,2) NOT NULL,              -- Total debt amount
  monthly_rate DECIMAL(15,2),                 -- Monthly rent/rate

  -- Period
  period_description VARCHAR(100),            -- "May-September", "June", etc.
  period_start DATE,
  period_end DATE,

  -- Location & Branch
  office VARCHAR(50),                         -- Office number: "101", "302", etc.
  branch_id VARCHAR NOT NULL REFERENCES branches(id),

  -- Payment expectation
  expected_payment_method VARCHAR(20),        -- 'cash' or 'bank'

  -- Status
  status VARCHAR(20) DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'partial', 'paid', 'written_off')),
  paid_amount DECIMAL(15,2) DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,

  -- Metadata
  source VARCHAR(50),                         -- 'import_2022', 'import_2023', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receivables_branch ON receivables(branch_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_client ON receivables(client_id);
CREATE INDEX IF NOT EXISTS idx_receivables_customer ON receivables(customer_name);

-- ============================================
-- Import Historical Debts from Labzak Excel
-- ============================================

DO $$
DECLARE
  v_labzak_branch VARCHAR := 'labzak';
  v_client_id UUID;
BEGIN
  -- ============================================
  -- DEBTS SHEET (2022) - 30 records, 180,310,288 UZS total
  -- ============================================

  -- MENPOWER
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'MENPOWER' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, office, branch_id, notes, source)
  VALUES ('MENPOWER', v_client_id, 48840000, 9768000, 'May-September', NULL, v_labzak_branch, 'Oktyabrga ham yuborildi', 'import_2022');

  -- BCI
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'BCI' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('BCI', v_client_id, 3438, 573, 'July-December', v_labzak_branch, 'import_2022');

  -- IMAN
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'IMAN' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('IMAN', v_client_id, 10000000, 5000000, 'August-September', v_labzak_branch, 'import_2022');

  -- ExportGroup
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'EXPORTGROUP' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, notes, source)
  VALUES ('ExportGroup', v_client_id, 23375000, 8675000, 'July-September', v_labzak_branch, 'Iyuldan 6,0250 qarz qolgan', 'import_2022');

  -- ExportGroup Minerals (2 entries)
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'EXPORTGROUP MINERALS' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, notes, source)
  VALUES ('ExportGroup Minerals', v_client_id, 14283870, 5400000, 'July-August', v_labzak_branch, '302-xona uchun', 'import_2022');
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, notes, source)
  VALUES ('ExportGroup Minerals', v_client_id, 1625806, 1625806, 'August-September', v_labzak_branch, 'EI shartnoma uchun', 'import_2022');

  -- Grand Aero Group
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'GRAND AERO GROUP' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Grand Aero Group', v_client_id, 11900000, 4500000, 'July-September', v_labzak_branch, 'import_2022');

  -- Abdulbosit Xasanov
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'ABDULBOSIT XASANOV' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, expected_payment_method, source)
  VALUES ('Abdulbosit Xasanov', v_client_id, 6400000, 1500000, 'August-September', v_labzak_branch, 'cash', 'import_2022');

  -- NPO Zavod KRM
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'NPO ZAVOD KRM' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, notes, source)
  VALUES ('NPO Zavod KRM', v_client_id, 4120000, 1200000, 'June-September', v_labzak_branch, 'EI - 17.06.2022 boshlangan', 'import_2022');

  -- TechCells
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'TECHCELLS' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, notes, source)
  VALUES ('TechCells', v_client_id, 3856667, 1100000, 'June-September', v_labzak_branch, '256,667 birinchi oy', 'import_2022');

  -- NWPSOFT
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'NWPSOFT' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, notes, source)
  VALUES ('NWPSOFT', v_client_id, 2496667, 700000, 'June-September', v_labzak_branch, '396,667 birinchi oy', 'import_2022');

  -- Great Best Trade Biznes
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'GREAT BEST TRADE BIZNES' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Great Best Trade Biznes', v_client_id, 1400000, 700000, 'August-September', v_labzak_branch, 'import_2022');

  -- Sport Statistics
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'SPORT STATISTICS' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Sport Statistics', v_client_id, 2400000, 1200000, 'August-September', v_labzak_branch, 'import_2022');

  -- Aminalab
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'AMINALAB' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Aminalab', v_client_id, 1400000, 700000, 'August-September', v_labzak_branch, 'import_2022');

  -- Viaggio in Asia
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'VIAGGIO IN ASIA' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, notes, source)
  VALUES ('Viaggio in Asia', v_client_id, 2729032, 1800000, 'August-September', v_labzak_branch, '929,032 birinchi oy', 'import_2022');

  -- PeoplePay U
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'PEOPLEPAY U' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, notes, source)
  VALUES ('PeoplePay U', v_client_id, 812903, 1800000, 'September', v_labzak_branch, 'Shuni Abdulbosit bilan gaplashish kerak', 'import_2022');

  -- Profi Staff
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'PROFI STAFF' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Profi Staff', v_client_id, 9000000, 9000000, 'September', v_labzak_branch, 'import_2022');

  -- Applied Labs
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'APPLIED LABS' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, notes, source)
  VALUES ('Applied Labs', v_client_id, 24254000, 27320000, 'September', v_labzak_branch, 'Shuni hisoblab korish kerak', 'import_2022');

  -- Clean Field
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'CLEAN FIELD' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Clean Field', v_client_id, 1200000, 1200000, 'September', v_labzak_branch, 'import_2022');

  -- Impex Community
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'IMPEX COMMUNITY' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Impex Community', v_client_id, 1200000, 1200000, 'September', v_labzak_branch, 'import_2022');

  -- Inhost
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'INHOST' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Inhost', v_client_id, 1800000, 1800000, 'September', v_labzak_branch, 'import_2022');

  -- Dyninno Tas International
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'DYNINNO TAS INTERNATIONAL' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Dyninno Tas International', v_client_id, 1200000, 1200000, 'September', v_labzak_branch, 'import_2022');

  -- Stalnaya Marka
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'STALNAYA MARKA' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Stalnaya Marka', v_client_id, 116130, 1200000, 'September', v_labzak_branch, 'import_2022');

  -- Haul Trucks CA
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'HAUL TRUCKS CA' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Haul Trucks CA', v_client_id, 1200000, 1200000, 'September', v_labzak_branch, 'import_2022');

  -- Tuerredda
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'TUERREDDA' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Tuerredda', v_client_id, 1200000, 1200000, 'September', v_labzak_branch, 'import_2022');

  -- Ayam Roads
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'AYAM ROADS' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Ayam Roads', v_client_id, 1200000, 1200000, 'September', v_labzak_branch, 'import_2022');

  -- VLS-COM
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'VLS-COM' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('VLS-COM', v_client_id, 400000, 1200000, 'September', v_labzak_branch, 'import_2022');

  -- Instant Payment Solutions
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'INSTANT PAYMENT SOLUTIONS' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Instant Payment Solutions', v_client_id, 700000, 700000, 'September', v_labzak_branch, 'import_2022');

  -- Midas Operation
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'MIDAS OPERATION' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Midas Operation', v_client_id, 700000, 700000, 'September', v_labzak_branch, 'import_2022');

  -- Delcreda
  SELECT id INTO v_client_id FROM clients WHERE name_normalized = 'DELCREDA' AND branch_id = v_labzak_branch LIMIT 1;
  INSERT INTO receivables (customer_name, client_id, amount, monthly_rate, period_description, branch_id, source)
  VALUES ('Delcreda', v_client_id, 496775, 700000, 'September', v_labzak_branch, 'import_2022');

  -- ============================================
  -- DEBTORS 2023 SHEET - 46 records, 298,172,311 UZS total
  -- ============================================

  -- IMAN (101+307+403)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source)
  VALUES ('IMAN', 150000000, 50000000, 'April - June', '101+307+403', v_labzak_branch, 'bank', 'import_2023');

  -- OOO «Profi Staff» (204)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source)
  VALUES ('OOO «Profi Staff»', 9900000, 9900000, 'June', '204', v_labzak_branch, 'bank', 'import_2023');

  -- Sanjar Adizov (Opto) (302)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source)
  VALUES ('Sanjar Adizov (Opto)', 4000000, 4000000, 'June', '302', v_labzak_branch, 'cash', 'import_2023');

  -- INVITRIS (303)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source)
  VALUES ('INVITRIS', 19800000, 19800000, 'April - June', '303', v_labzak_branch, 'bank', 'import_2023');

  -- Sanjar Adizov (Exadot) (401)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source)
  VALUES ('Sanjar Adizov (Exadot)', 13500000, 13500000, 'June', '401', v_labzak_branch, 'cash', 'import_2023');

  -- BCLOUDS (404)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source)
  VALUES ('BCLOUDS', 12000000, 12000000, 'June', '404', v_labzak_branch, 'bank', 'import_2023');

  -- MenPower Kaz (409)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source)
  VALUES ('MenPower Kaz ($880)', 10000000, 10000000, 'March', '409', v_labzak_branch, 'bank', 'import_2023');

  -- Remaining 2023 debtors (Open Area - OA)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source) VALUES
  ('ООО «Exim Supply»', 1800000, 1800000, 'June', 'OA', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «PROFIT SERVICE PREMIUM»', 5890000, 2200000, 'April - June', 'OA', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «TDS MEDIA ONE»', 3477355, 2200000, 'May - June', 'OA', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «DR-SIGMA»', 1500000, 1500000, 'June', 'OA', v_labzak_branch, 'bank', 'import_2023');

  -- Individual debtors (O)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source) VALUES
  ('Alisher Ergashev', 1800000, 1800000, 'June', 'O', v_labzak_branch, 'cash', 'import_2023'),
  ('Nurmuhammad', 2000000, 2000000, 'June', 'O', v_labzak_branch, 'cash', 'import_2023'),
  ('Azizbek Rasulov', 500000, 500000, 'June', 'O', v_labzak_branch, 'cash', 'import_2023');

  -- E-Ijara debtors (EI)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source) VALUES
  ('ЧП «TOSHKENT MED TEX CA»', 1000000, 1000000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('OOO «BEST LOGISTIC SOLUTION CA»', 1461290, 1000000, 'May - June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «SPORT STATISTICS»', 2400000, 1200000, 'May - June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «REDWOOD PRO»', 1500000, 1500000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('OOO «INHOST»', 1800000, 1800000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('OOO «YOLDOSH EXPORT»', 1500000, 1500000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «GEONA-GROUP»', 1500000, 1500000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «VLS-COM»', 3000000, 1500000, 'May - June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «RAPID SOLUTION»', 3000000, 1500000, 'March - April', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «START TRADE AND TECHNOLOGY»', 1300000, 1300000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «NOVA FUTURUM IT»', 1200000, 1200000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «IMPEX COMMUNITY»', 1800000, 1800000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «TECHCELLS»', 1200000, 1200000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «TUERREDDA»', 7500000, 1500000, 'February - June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «SGGROUP-U»', 1500000, 1500000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «JBF COMPONENTS FE LLC»', 5087000, 1500000, 'March - June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('OOO «TECH-HIVE»', 1500000, 1500000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «OPTO DELIVERY»', 1000000, 1000000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «SMART SOLUTIONS INTERNATIONAL»', 1500000, 1500000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «GRAND-AERO-EXPORT»', 3000000, 1000000, 'April - June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «STONE CRAFTERS»', 3000000, 1500000, 'April - May', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ИП ООО «BEL-WEST-CONSULT»', 3650000, 1500000, 'April - June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «STANDARD STEEL CO»', 150000, 150000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «MIDAS OPERATION»', 3000000, 1500000, 'May - June', 'EI', v_labzak_branch, 'bank', 'import_2023'),
  ('OOO «GGIS INTEGRATSIYA»', 1500000, 1500000, 'June', 'EI', v_labzak_branch, 'bank', 'import_2023');

  -- Parking debtors (P)
  INSERT INTO receivables (customer_name, amount, monthly_rate, period_description, office, branch_id, expected_payment_method, source) VALUES
  ('OOO «TRINITY CENTER»', 1150000, 1300000, 'June', 'EI+P', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «MENTO EDTECH»', 800000, 800000, 'June', 'P', v_labzak_branch, 'bank', 'import_2023'),
  ('OOO «EXADOT»', 500000, 500000, 'June', 'P', v_labzak_branch, 'bank', 'import_2023'),
  ('OOO «XI YUANG DONG TIEXTILE»', 800000, 800000, 'June', 'P', v_labzak_branch, 'bank', 'import_2023'),
  ('ООО «INN-TEX»', 2400000, 800000, 'January - April', 'P', v_labzak_branch, 'bank', 'import_2023'),
  ('OOO «VERTEX-KZ»', 1306666, 800000, 'April - May', 'P', v_labzak_branch, 'bank', 'import_2023');

  RAISE NOTICE 'Imported historical receivables for Labzak branch';
END $$;

-- Summary
DO $$
DECLARE
  v_total_2022 DECIMAL;
  v_total_2023 DECIMAL;
  v_count_2022 INT;
  v_count_2023 INT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_count_2022, v_total_2022
  FROM receivables WHERE source = 'import_2022';

  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_count_2023, v_total_2023
  FROM receivables WHERE source = 'import_2023';

  RAISE NOTICE '=== RECEIVABLES IMPORT SUMMARY ===';
  RAISE NOTICE '2022 Debts: % records, % UZS', v_count_2022, v_total_2022;
  RAISE NOTICE '2023 Debtors: % records, % UZS', v_count_2023, v_total_2023;
  RAISE NOTICE 'Total: % records, % UZS', v_count_2022 + v_count_2023, v_total_2022 + v_total_2023;
END $$;
