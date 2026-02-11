-- ============================================================================
-- Seed: Metronome Sync — Initial Data from Jan 20, 2026 Leadership Sync
-- Date: 2026-02-10
-- Description: Seeds the 5 metronome tables with real data from the first
--   Metronome Sync meeting (Jan 20, 2026). Includes 14 active initiatives,
--   ~50 action items, 5 decisions, 15 key dates, and 1 sync record.
--
-- NOTE: This script looks up employee UUIDs from the employees table by
--   employee_id (EMP###). If an employee is not found, the field is set to
--   NULL (for assigned_to) or falls back to the GM's UUID (for created_by).
--
-- Idempotency: Uses a DO block that checks if data already exists before
--   inserting. Safe to run multiple times.
-- ============================================================================

DO $$
DECLARE
  -- Employee UUID lookups
  v_zuxriddin UUID;  -- EMP018, GM (General Manager) — created_by default
  v_ubaydullo UUID;  -- EMP049, Business Developer
  v_nigina    UUID;  -- EMP003, Legal Manager
  v_sulhiya   UUID;  -- EMP015, QA / Finance
  v_ruxshona  UUID;  -- EMP005, QA / HR & Service
  v_durbek    UUID;  -- EMP037, Construction Manager

  -- Initiative UUIDs (generated fresh for FK references)
  v_init_centris_offer      UUID;
  v_init_ferghana_tiles     UUID;
  v_init_park_furniture     UUID;
  v_init_shevchenko_sales   UUID;
  v_init_shevchenko_partner UUID;
  v_init_minor_building     UUID;
  v_init_newport            UUID;
  v_init_muqimiy_rent       UUID;
  v_init_centris_constr     UUID;
  v_init_ferghana_launch    UUID;
  v_init_diplomat           UUID;
  v_init_hr_system          UUID;
  v_init_scaling_up         UUID;
  v_init_legal_automation   UUID;

  -- Resolved initiatives
  v_init_centris_4f         UUID;
  v_init_beruniy_rent       UUID;
  v_init_peopleforce        UUID;
  v_init_safetycult         UUID;
  v_init_centris_terms      UUID;

  -- Sync record UUID
  v_sync_jan20 UUID;

  -- Guard: skip if already seeded
  v_existing_count INTEGER;

BEGIN
  -- ========================================================================
  -- GUARD: Check if seed data already exists
  -- ========================================================================
  SELECT COUNT(*) INTO v_existing_count FROM metronome_initiatives;
  IF v_existing_count > 0 THEN
    RAISE NOTICE 'Metronome seed data already exists (% initiatives found). Skipping.', v_existing_count;
    RETURN;
  END IF;

  -- ========================================================================
  -- LOOKUP EMPLOYEE UUIDs
  -- ========================================================================
  SELECT id INTO v_zuxriddin FROM employees WHERE employee_id = 'EMP018' LIMIT 1;
  SELECT id INTO v_ubaydullo FROM employees WHERE employee_id = 'EMP049' LIMIT 1;
  SELECT id INTO v_nigina    FROM employees WHERE employee_id = 'EMP003' LIMIT 1;
  SELECT id INTO v_sulhiya   FROM employees WHERE employee_id = 'EMP015' LIMIT 1;
  SELECT id INTO v_ruxshona  FROM employees WHERE employee_id = 'EMP005' LIMIT 1;
  SELECT id INTO v_durbek    FROM employees WHERE employee_id = 'EMP037' LIMIT 1;

  -- Fallback: if GM not found, abort
  IF v_zuxriddin IS NULL THEN
    RAISE EXCEPTION 'Cannot seed: Employee EMP018 (Zuxriddin / GM) not found in employees table.';
  END IF;

  -- ========================================================================
  -- GENERATE UUIDs FOR INITIATIVES (so action items can reference them)
  -- ========================================================================
  v_init_centris_offer      := uuid_generate_v4();
  v_init_ferghana_tiles     := uuid_generate_v4();
  v_init_park_furniture     := uuid_generate_v4();
  v_init_shevchenko_sales   := uuid_generate_v4();
  v_init_shevchenko_partner := uuid_generate_v4();
  v_init_minor_building     := uuid_generate_v4();
  v_init_newport            := uuid_generate_v4();
  v_init_muqimiy_rent       := uuid_generate_v4();
  v_init_centris_constr     := uuid_generate_v4();
  v_init_ferghana_launch    := uuid_generate_v4();
  v_init_diplomat           := uuid_generate_v4();
  v_init_hr_system          := uuid_generate_v4();
  v_init_scaling_up         := uuid_generate_v4();
  v_init_legal_automation   := uuid_generate_v4();

  -- Resolved
  v_init_centris_4f     := uuid_generate_v4();
  v_init_beruniy_rent   := uuid_generate_v4();
  v_init_peopleforce    := uuid_generate_v4();
  v_init_safetycult     := uuid_generate_v4();
  v_init_centris_terms  := uuid_generate_v4();

  v_sync_jan20 := uuid_generate_v4();


  -- ========================================================================
  -- 1. INITIATIVES — CRITICAL (6)
  -- ========================================================================

  -- 1. Centris Partnership Offer
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_centris_offer,
    'Centris Partnership Offer',
    'Investor gets 80% share first at 12% ROI (based on building + renovation cost), C-Space gets 20% above. Revenue above 100% split 80/20 with equal dividend rights. Key pending: building price will determine how much 80% is worth.',
    'bd', 'critical',
    ARRAY[v_ubaydullo, v_zuxriddin]::UUID[],
    'Ubaydulloh + Dilmurod',
    'Awaiting counter-offer from building owner',
    '2026-01-22', 'By Wed',
    FALSE, 1, v_zuxriddin
  );

  -- 2. C-Space Ferghana Floor Tiles
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_ferghana_tiles,
    'C-Space Ferghana Floor Tiles',
    'Floor tiles selection for Ferghana branch. Yunusabad tile specs to be applied. Smartlocks order is next after tiles.',
    'construction', 'critical',
    ARRAY[v_zuxriddin]::UUID[],
    'Zukhriddin',
    'Tiles ordered — Smartlocks next',
    '2026-01-22', 'By Wed',
    FALSE, 2, v_zuxriddin
  );

  -- 3. C-Space Park Furniture Review
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_park_furniture,
    'C-Space Park Furniture Review',
    'Must finalize specs and order before Chinese New Year (~Jan 25) or face major delays from Ergo/Kano production shutdown.',
    'construction', 'critical',
    ARRAY[v_zuxriddin]::UUID[],
    'Zukhriddin',
    'Specs in progress',
    '2026-01-25', 'Before CNY (~Jan 25)',
    FALSE, 3, v_zuxriddin
  );

  -- 4. Shevchenko Sales Campaign
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_shevchenko_sales,
    'Shevchenko Sales Campaign',
    '4+ corporate prospects in pipeline. Daily follow-up calls required. Target: close first corporate contract by Jan 25.',
    'bd', 'critical',
    ARRAY[v_ubaydullo]::UUID[],
    'Ubaydulloh',
    '4+ corporate prospects in pipeline',
    NULL, 'Ongoing',
    FALSE, 4, v_zuxriddin
  );

  -- 5. Shevchenko Partner Contract
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_shevchenko_partner,
    'Shevchenko Partner Contract',
    'Polumatoviy (semi-matte) finish contract — finalize terms with partner. Minor revisions needed.',
    'legal', 'critical',
    ARRAY[v_nigina]::UUID[],
    'Nigina + Dilmurod',
    'Minor revisions needed',
    '2026-01-22', 'By Wed',
    FALSE, 5, v_zuxriddin
  );

  -- 6. Minor Building Partnership
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_minor_building,
    'Minor Building Partnership',
    'Meeting held with investor (Ismoil aka). He will respond by Wednesday next week (Jan 22). Under review.',
    'bd', 'critical',
    ARRAY[v_ubaydullo]::UUID[],
    'Ubaydulloh',
    'Under review — awaiting Ismoil aka response',
    '2026-01-22', 'Wed Jan 22',
    FALSE, 6, v_zuxriddin
  );


  -- ========================================================================
  -- 2. INITIATIVES — HIGH PRIORITY (6)
  -- ========================================================================

  -- 7. C-Space Newport Procurement
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_newport,
    'C-Space Newport Procurement',
    'Procurement across 10 categories: Armstrong Ceiling (confirmed), Philips Lighting (URGENT — no offer), Acoustic Panels (in progress), Doors & Cladding (confirmed), Phone Booth Doors (in progress), Door Hardware - Kangju (confirmed), Furniture - Kano (confirmed, Feb 20-Mar 1 delivery), IT & Cameras (confirmed), Smartlocks - ZKTeco via Proto (in progress), LVT & Carpet (URGENT — contact FloraFloor & BLOQ).',
    'construction', 'high',
    ARRAY[v_zuxriddin]::UUID[],
    'Zukhriddin + ImomMuhammad',
    '4 Confirmed | 4 Pending | 2 URGENT',
    '2026-03-01', 'Feb 20 - Mar 1 (furniture)',
    FALSE, 7, v_zuxriddin
  );

  -- 8. Muqimiy Rent (Sub-rent)
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_muqimiy_rent,
    'Muqimiy Rent (Sub-rent)',
    'Rent increased: 17,400,000 UZS + 560 USD (+100 USD from before). Still stuck — no response from MaxWay partner.',
    'finance', 'high',
    ARRAY[v_nigina]::UUID[],
    'Dilmurod + Nigina',
    'STILL STUCK — No response from MaxWay partner',
    NULL, 'Ongoing',
    FALSE, 8, v_zuxriddin
  );

  -- 9. C-Space Centris Construction
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_centris_constr,
    'C-Space Centris Construction',
    'All floors approved: 2F (Premium + Reception, Bar, Kitchen, Lounge), 3F (SME offices 2-10 person, Meeting Room), 4F (Corporate split for 2 companies).',
    'construction', 'high',
    ARRAY[v_zuxriddin, v_durbek]::UUID[],
    'Zukhriddin + Durbek',
    'All floors approved',
    NULL, 'Ongoing',
    FALSE, 9, v_zuxriddin
  );

  -- 10. C-Space Ferghana (Launch)
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_ferghana_launch,
    'C-Space Ferghana Launch',
    'Under construction. Furniture delivery expected Feb 20 - Mar 1. Opening Soon posters need design & print.',
    'construction', 'high',
    ARRAY[v_zuxriddin]::UUID[],
    'Zukhriddin',
    'Under construction',
    '2026-03-01', 'Feb 20-Mar 1 (furniture)',
    FALSE, 10, v_zuxriddin
  );

  -- 11. Diplomat University Opportunity
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_diplomat,
    'Diplomat University Opportunity',
    '7,000 sqm full building. Available Summer 2026 (university exits). Est. opening January 2027. Key issue: PARKING requires solution. Financial model not yet started.',
    'bd', 'high',
    ARRAY[v_zuxriddin]::UUID[],
    'Zukhriddin + Leadership',
    'Fin Model not yet begun',
    NULL, 'Not started',
    FALSE, 11, v_zuxriddin
  );

  -- 12. HR System Selection
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_hr_system,
    'HR System Selection',
    'PeopleForce rejected (too expensive). Exploring alternatives: Odoo, etc.',
    'hr', 'high',
    ARRAY[v_ruxshona, v_nigina]::UUID[],
    'Rukhshona + Nigina',
    'PeopleForce rejected (too expensive)',
    NULL, 'Ongoing',
    FALSE, 12, v_zuxriddin
  );


  -- ========================================================================
  -- 3. INITIATIVES — STRATEGIC (2)
  -- ========================================================================

  -- 13. Scaling Up
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_scaling_up,
    'Scaling Up',
    'Key Thrust: 10 Cities, 5 Countries (by Dec 2028). Capabilities defined: 6 Day Closing, Finance System Implementation, Franchising Package.',
    'strategy', 'strategic',
    ARRAY[v_zuxriddin]::UUID[],
    'Leadership',
    'Key Thrust & Capabilities DEFINED',
    NULL, 'Ongoing',
    FALSE, 13, v_zuxriddin
  );

  -- 14. Legal Process Automation
  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES (
    v_init_legal_automation,
    'Legal Process Automation',
    'Tool selection between Tally vs Google Forms. Build Phase 1: Forms for 5 request types.',
    'legal', 'strategic',
    ARRAY[v_nigina]::UUID[],
    'Nigina',
    'Tool selection in progress',
    '2026-01-31', 'Jan 31',
    FALSE, 14, v_zuxriddin
  );


  -- ========================================================================
  -- 4. INITIATIVES — RESOLVED (5)
  -- ========================================================================

  INSERT INTO metronome_initiatives (id, title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label, is_archived, sort_order, created_by)
  VALUES
    (v_init_centris_4f, 'Centris 4th Floor Layout', 'Layout approved for corporate split for 2 companies.', 'construction', 'resolved', ARRAY[v_zuxriddin]::UUID[], 'Zukhriddin', 'Approved', '2026-01-20', NULL, TRUE, 100, v_zuxriddin),
    (v_init_beruniy_rent, 'Beruniy Rent', 'Rent payment completed.', 'finance', 'resolved', ARRAY[v_sulhiya]::UUID[], 'Finance', 'Completed', '2026-01-20', NULL, TRUE, 101, v_zuxriddin),
    (v_init_peopleforce, 'PeopleForce Evaluation', 'Evaluated and rejected due to cost.', 'hr', 'resolved', ARRAY[v_ruxshona]::UUID[], 'Rukhshona', 'Rejected — cost', '2026-01-20', NULL, TRUE, 102, v_zuxriddin),
    (v_init_safetycult, 'SafetyCulture Setup', 'Daily inspections running.', 'service', 'resolved', ARRAY[v_ruxshona]::UUID[], 'Rukhshona', 'Daily inspections running', '2026-01-20', NULL, TRUE, 103, v_zuxriddin),
    (v_init_centris_terms, 'Centris Offer Terms Agreement', 'Agreed with building owner on 80/20 structure.', 'bd', 'resolved', ARRAY[v_ubaydullo]::UUID[], 'Ubaydulloh', 'Agreed — 80/20 structure', '2026-01-20', NULL, TRUE, 104, v_zuxriddin);


  -- ========================================================================
  -- 5. ACTION ITEMS — CRITICAL INITIATIVES
  -- ========================================================================

  -- 1. Centris Partnership Offer (4 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_centris_offer, 'Receive counter-offer with building price', 'pending', v_ubaydullo, '2026-01-22', 1),
    (v_init_centris_offer, 'Review and analyze offer terms', 'pending', v_zuxriddin, NULL, 2),
    (v_init_centris_offer, 'Prepare response/counter-proposal', 'pending', v_ubaydullo, '2026-01-22', 3),
    (v_init_centris_offer, 'Deliver final answer to building owner', 'pending', v_zuxriddin, '2026-01-22', 4);

  -- 2. Ferghana Floor Tiles (3 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_ferghana_tiles, 'Yunusabad tile specs applied', 'pending', v_zuxriddin, '2026-01-22', 1),
    (v_init_ferghana_tiles, 'Finalize tile choice and place order', 'pending', v_zuxriddin, '2026-01-22', 2),
    (v_init_ferghana_tiles, 'Coordinate delivery timeline', 'pending', v_zuxriddin, NULL, 3);

  -- 3. Park Furniture Review (3 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_park_furniture, 'Complete furniture specifications', 'in_progress', v_zuxriddin, '2026-01-20', 1),
    (v_init_park_furniture, 'Leadership review of specs', 'pending', v_zuxriddin, '2026-01-22', 2),
    (v_init_park_furniture, 'Submit order to Ergo', 'pending', v_zuxriddin, '2026-01-25', 3);

  -- 4. Shevchenko Sales Campaign (4 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_shevchenko_sales, 'Daily prospect follow-up calls', 'in_progress', v_ubaydullo, NULL, 1),
    (v_init_shevchenko_sales, 'Prepare room-by-room concept for visits', 'pending', v_ubaydullo, '2026-01-22', 2),
    (v_init_shevchenko_sales, 'Schedule site visits for top prospects', 'pending', v_ubaydullo, '2026-01-22', 3),
    (v_init_shevchenko_sales, 'Close first corporate contract', 'pending', v_ubaydullo, '2026-01-25', 4);

  -- 5. Shevchenko Partner Contract (3 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_shevchenko_partner, 'Finalize polumatoviy (semi-matte) finish contract', 'in_progress', v_nigina, '2026-01-22', 1),
    (v_init_shevchenko_partner, 'Final review with partner', 'pending', v_nigina, '2026-01-22', 2),
    (v_init_shevchenko_partner, 'Contract signing', 'pending', v_nigina, '2026-01-22', 3);

  -- 6. Minor Building Partnership (3 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_minor_building, 'Await Ismoil aka decision', 'blocked', v_ubaydullo, '2026-01-22', 1),
    (v_init_minor_building, 'Review response and prepare next steps', 'pending', v_ubaydullo, NULL, 2),
    (v_init_minor_building, 'Finalize terms if positive', 'pending', v_zuxriddin, NULL, 3);


  -- ========================================================================
  -- 6. ACTION ITEMS — HIGH PRIORITY INITIATIVES
  -- ========================================================================

  -- 7. Newport Procurement (10 items — one per procurement category)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_newport, 'Armstrong Ceiling — Confirm delivery date', 'done', v_zuxriddin, NULL, 1),
    (v_init_newport, 'Philips Lighting — Get offer ASAP (URGENT: no prices received)', 'pending', v_zuxriddin, '2026-01-22', 2),
    (v_init_newport, 'Acoustic Panels — Get final prices (Linear Baffles, FETR, Round, Event)', 'in_progress', v_zuxriddin, NULL, 3),
    (v_init_newport, 'Doors & Cladding — BNBMG finish selected, confirm delivery', 'done', v_zuxriddin, NULL, 4),
    (v_init_newport, 'Phone Booth Doors — Place order: 6 pcs fluted glass, black frame', 'in_progress', v_zuxriddin, NULL, 5),
    (v_init_newport, 'Door Hardware — Kangju: ACCEPT OFFER (confirmed)', 'done', v_zuxriddin, NULL, 6),
    (v_init_newport, 'Furniture (Kano) — Track shipment, delivery Feb 20-Mar 1', 'done', v_zuxriddin, '2026-03-01', 7),
    (v_init_newport, 'IT & Cameras — Mikrotik, Ubiquiti, Hikvision: confirm delivery', 'done', v_zuxriddin, NULL, 8),
    (v_init_newport, 'Smartlocks — ZKTeco via Proto: ACCEPT OFFER + Add C-Space logo', 'in_progress', v_zuxriddin, NULL, 9),
    (v_init_newport, 'LVT & Carpet — Contact FloraFloor (1,943 sqm) & BLOQ (509 sqm) URGENT', 'pending', v_zuxriddin, '2026-01-22', 10);

  -- 8. Muqimiy Rent (2 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_muqimiy_rent, 'Follow up with MaxWay partner', 'pending', v_nigina, '2026-01-22', 1),
    (v_init_muqimiy_rent, 'Get decision on sub-rent opportunity', 'pending', v_nigina, '2026-01-22', 2);

  -- 9. Centris Construction (2 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_centris_constr, 'Coordinate construction timeline with Durbek', 'pending', v_zuxriddin, '2026-01-22', 1),
    (v_init_centris_constr, 'Begin 3D visualization work', 'pending', v_durbek, '2026-01-25', 2);

  -- 10. Ferghana Launch (4 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_ferghana_launch, 'Floor tiles selection (see Ferghana Tiles initiative)', 'pending', v_zuxriddin, '2026-01-22', 1),
    (v_init_ferghana_launch, 'Furniture selection finalized with Ergo', 'in_progress', v_zuxriddin, '2026-01-25', 2),
    (v_init_ferghana_launch, 'Opening Soon posters — design & print', 'pending', v_zuxriddin, '2026-01-25', 3),
    (v_init_ferghana_launch, 'Smartlocks order', 'pending', v_zuxriddin, '2026-01-25', 4);

  -- 11. Diplomat University (3 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_diplomat, 'Start Financial Model', 'pending', v_zuxriddin, NULL, 1),
    (v_init_diplomat, 'Assess parking solutions', 'pending', v_zuxriddin, NULL, 2),
    (v_init_diplomat, 'Leadership decision: Proceed or not?', 'pending', v_zuxriddin, NULL, 3);

  -- 12. HR System Selection (2 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_hr_system, 'Explore alternative HR systems (Odoo, etc.)', 'pending', v_ruxshona, '2026-01-25', 1),
    (v_init_hr_system, 'Present alternatives to leadership', 'pending', v_ruxshona, '2026-01-31', 2);


  -- ========================================================================
  -- 7. ACTION ITEMS — STRATEGIC INITIATIVES
  -- ========================================================================

  -- 13. Scaling Up (3 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_scaling_up, 'Strategic Session', 'pending', v_zuxriddin, '2026-01-20', 1),
    (v_init_scaling_up, 'Review Group structure proposal', 'in_progress', v_zuxriddin, NULL, 2),
    (v_init_scaling_up, 'Key Thrust & Capabilities — finalize document', 'done', v_zuxriddin, '2026-01-31', 3);

  -- 14. Legal Process Automation (2 items)
  INSERT INTO metronome_action_items (initiative_id, title, status, assigned_to, deadline, sort_order)
  VALUES
    (v_init_legal_automation, 'Tool selection: Tally vs Google Forms', 'pending', v_nigina, '2026-01-22', 1),
    (v_init_legal_automation, 'Build Phase 1: Forms for 5 request types', 'pending', v_nigina, '2026-01-31', 2);


  -- ========================================================================
  -- 8. DECISIONS (5 open)
  -- ========================================================================

  INSERT INTO metronome_decisions (question, initiative_id, function_tag, status, deadline, created_by)
  VALUES
    ('Centris: Accept/counter building owner''s offer?', v_init_centris_offer, 'bd', 'open', '2026-01-22', v_zuxriddin),
    ('Ferghana: Smartlocks order — which vendor and specs?', v_init_ferghana_tiles, 'construction', 'open', '2026-01-22', v_zuxriddin),
    ('Park: Furniture specs URGENT (5 days to CNY!) — approve current specs?', v_init_park_furniture, 'construction', 'open', '2026-01-25', v_zuxriddin),
    ('Shevchenko: Partner contract final terms — accept polumatoviy finish?', v_init_shevchenko_partner, 'legal', 'open', '2026-01-22', v_zuxriddin),
    ('Minor Building: Response to Ismoil aka''s decision — next steps?', v_init_minor_building, 'bd', 'open', '2026-01-22', v_zuxriddin);


  -- ========================================================================
  -- 9. KEY DATES (15)
  -- ========================================================================

  INSERT INTO metronome_key_dates (date, title, emoji, category, initiative_id, is_recurring, created_by)
  VALUES
    -- Past (completed context)
    ('2026-01-16', 'Strategic Session', '🚀', 'meeting', v_init_scaling_up, FALSE, v_zuxriddin),
    ('2026-01-17', 'Ferghana Tiles Selection', '🏗️', 'high', v_init_ferghana_tiles, FALSE, v_zuxriddin),
    ('2026-01-19', 'Ops Daily + Wages Submit', '👥', 'event', NULL, FALSE, v_zuxriddin),

    -- This week
    ('2026-01-20', 'Strategic Session + Partners Review + Centris Offer Review', '🚀', 'critical', v_init_scaling_up, FALSE, v_zuxriddin),
    ('2026-01-20', 'Wages Submit TODAY', '💰', 'critical', NULL, FALSE, v_zuxriddin),
    ('2026-01-21', 'VAT Tax Payment Due', '🧾', 'critical', NULL, FALSE, v_zuxriddin),
    ('2026-01-21', 'Fruit Day', '🍎', 'event', NULL, FALSE, v_zuxriddin),
    ('2026-01-22', 'Minor Building: Ismoil aka response expected', '📋', 'high', v_init_minor_building, FALSE, v_zuxriddin),
    ('2026-01-22', 'Next Sync — Wed 5PM', '🔄', 'meeting', NULL, FALSE, v_zuxriddin),

    -- CNY deadline
    ('2026-01-25', 'Chinese New Year — Kano/Ergo production STOPS', '🇨🇳', 'critical', v_init_park_furniture, FALSE, v_zuxriddin),
    ('2026-01-25', 'Finsheet completion + Utilities payment', '📊', 'high', NULL, FALSE, v_zuxriddin),
    ('2026-01-25', 'Shevchenko first contract target', '🎯', 'high', v_init_shevchenko_sales, FALSE, v_zuxriddin),

    -- Month end
    ('2026-01-31', 'Monthly Team Meeting', '👥', 'meeting', NULL, FALSE, v_zuxriddin),
    ('2026-01-31', 'Legal Process Phase 1 deadline', '⚖️', 'strategic', v_init_legal_automation, FALSE, v_zuxriddin),

    -- February
    ('2026-02-20', 'Ergo/Kano furniture delivery begins (Newport, Ferghana)', '📦', 'high', v_init_newport, FALSE, v_zuxriddin);


  -- ========================================================================
  -- 10. SYNC RECORD (Jan 20, 2026 meeting)
  -- ========================================================================

  INSERT INTO metronome_syncs (
    id, sync_date, title, notes,
    attendee_ids,
    started_at, ended_at, duration_seconds,
    next_sync_date, next_sync_focus,
    focus_areas,
    items_discussed, decisions_made, action_items_completed,
    created_by
  ) VALUES (
    v_sync_jan20,
    '2026-01-20',
    'Metronome Sync — Jan 20, 2026',
    'Leadership alignment on active priorities across branches and strategic initiatives. C-Space Group Monday sync.',

    -- Attendees (everyone we can look up)
    ARRAY[v_zuxriddin, v_ubaydullo, v_nigina, v_sulhiya, v_ruxshona]::UUID[],

    -- Timing
    '2026-01-20T10:30:00+05:00',
    '2026-01-20T11:30:00+05:00',
    3600, -- 1 hour

    -- Next sync
    '2026-01-22',
    'Centris counter-offer review, Minor Building response, Shevchenko contract signing',

    -- Focus areas per person
    '[
      {"person": "Dilmurod", "items": ["Wages approval TODAY + VAT prep for tomorrow", "Review Centris counter-offer when received", "Muqimiy rent: Push for MaxWay partner decision"]},
      {"person": "Zukhriddin", "items": ["Park furniture specs (CNY deadline Jan 25!)", "Newport punch list", "Newport: Accept deal terms (Kangju, ZKTeco confirmed) + Logo for door lock", "Centris: 4F approved - coordinate next steps with Durbek"]},
      {"person": "Ubaydulloh", "items": ["Shevchenko: 4+ corporate prospects - daily follow-up", "Centris: Prepare response once counter-offer received", "Minor Building: Await Ismoil aka response (Wed)", "Partners Review meeting TODAY"]},
      {"person": "Sulhiya", "items": ["Q4 Reports: Final review", "January wages preparation", "Looker dashboard updates"]},
      {"person": "Rukhshona", "items": ["SafetyCulture: Maintain daily compliance", "HR System: Explore alternatives to PeopleForce", "Recruitment pipeline"]},
      {"person": "Nigina", "items": ["Shevchenko: Polumatoviy finish contract - finalize terms", "Muqimiy rent: Clarify status with MaxWay partner", "Legal Process Automation: Tool selection"]}
    ]'::JSONB,

    -- Stats
    14,  -- items_discussed (14 active initiatives)
    0,   -- decisions_made (5 open, none decided yet)
    5,   -- action_items_completed (5 resolved items)

    v_zuxriddin
  );


  RAISE NOTICE 'Metronome seed data inserted successfully: 19 initiatives, ~50 action items, 5 decisions, 15 key dates, 1 sync record.';

END $$;
