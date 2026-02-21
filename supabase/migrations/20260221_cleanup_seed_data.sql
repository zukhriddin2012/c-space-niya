-- Remove ALL seeded demo data from usage_events
-- The first seed run (922c6fe) used real endpoint paths like '/api/employees',
-- while the second run (f4d590a) used '/seed' as a marker.
-- Since no organic tracking has occurred yet, all rows are seed data.
TRUNCATE usage_events;
