-- ============================================
-- Add client_id foreign key to transactions
-- Allows linking transactions to clients table
-- ============================================

-- Add client_id column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Create index for faster lookups by client
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);

-- Add comment
COMMENT ON COLUMN transactions.client_id IS 'Optional reference to clients table - links transaction to a known client';
