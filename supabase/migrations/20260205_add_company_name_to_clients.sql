-- Migration: Add company_name column to clients table
-- Date: 2026-02-05
-- Description: Adds company_name field for individuals to track where they work

-- Add company_name column for individuals (where they work)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Add comment for clarity
COMMENT ON COLUMN clients.company_name IS 'For individuals: the company/organization where they work';
