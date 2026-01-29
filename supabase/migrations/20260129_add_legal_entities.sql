-- ============================================================================
-- ADD ALL LEGAL ENTITIES
-- Adds new legal entities for all C-Space branches
-- ============================================================================

-- Insert all legal entities (ON CONFLICT handles existing ones)
INSERT INTO legal_entities (id, name, inn) VALUES
  ('cspace_main', 'C-Space LLC', '123456789'),
  ('cspace_labzak', 'C-Space Labzak LLC', '234567890'),
  ('cspace_orient', 'C-Space Orient LLC', '345678901'),
  ('cspace_aero', 'CS Aero LLC', '456789012'),
  ('cspace_chust', 'C-Space Chust LLC', '567890123'),
  ('cspace_yandex', 'C-Space Yandex LLC', '678901234'),
  ('cspace_muqimiy', 'C-Space Muqimiy LLC', '789012345'),
  ('cspace_elbek', 'C-Space Elbek LLC', '890123456')
ON CONFLICT (id) DO NOTHING;
