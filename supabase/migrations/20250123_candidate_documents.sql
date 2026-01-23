-- Candidate Documents table for Term Sheets and other signing documents
-- This table stores documents that candidates need to sign electronically

CREATE TABLE IF NOT EXISTS candidate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  -- Document type
  document_type VARCHAR(100) NOT NULL DEFAULT 'Условия трудоустройства',

  -- Candidate Info
  candidate_name VARCHAR(255),
  position VARCHAR(100),
  branch_id TEXT REFERENCES branches(id),
  branch_name VARCHAR(100),
  branch_address TEXT,
  reporting_to VARCHAR(100),

  -- Selection Results
  screening_passed BOOLEAN DEFAULT true,
  interview1_passed BOOLEAN DEFAULT true,
  interview2_passed BOOLEAN DEFAULT false,

  -- Employment Terms
  contract_type VARCHAR(100) DEFAULT 'Трудовой договор на 1 год',
  contract_duration VARCHAR(50),
  start_date DATE,
  salary VARCHAR(50),
  salary_review VARCHAR(255),

  -- Probation Metrics (JSON array)
  probation_metrics JSONB DEFAULT '[]'::jsonb,

  -- Final Interview
  final_interview_date DATE,
  final_interview_time VARCHAR(10),
  final_interview_interviewer VARCHAR(255),
  final_interview_purpose TEXT,

  -- Onboarding (JSON array)
  onboarding_weeks JSONB DEFAULT '[]'::jsonb,

  -- Contacts (JSON array)
  contacts JSONB DEFAULT '[]'::jsonb,

  -- Escalation
  escalation_contact VARCHAR(255),
  escalation_contact_position VARCHAR(100),

  -- Company Representative
  representative_name VARCHAR(255),
  representative_position VARCHAR(100),

  -- Signing flow
  signing_token VARCHAR(64) UNIQUE NOT NULL,
  access_password VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'expired')),

  -- Signature data
  signature_type VARCHAR(20) CHECK (signature_type IN ('draw', 'type')),
  signature_data TEXT, -- Base64 image for drawn, JSON for typed
  signed_at TIMESTAMPTZ,

  -- Audit trail
  signer_ip VARCHAR(50),
  signer_user_agent TEXT,

  -- PDF storage (optional - for generated PDFs)
  pdf_file_path TEXT,
  pdf_file_size INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Who created the document
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_candidate_documents_candidate ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_token ON candidate_documents(signing_token);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_status ON candidate_documents(status);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_candidate_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_candidate_documents_updated_at ON candidate_documents;
CREATE TRIGGER trigger_candidate_documents_updated_at
  BEFORE UPDATE ON candidate_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_documents_updated_at();

-- Enable RLS
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can do anything with candidate_documents" ON candidate_documents;
DROP POLICY IF EXISTS "Authenticated users can read candidate_documents" ON candidate_documents;
DROP POLICY IF EXISTS "Authenticated users can create candidate_documents" ON candidate_documents;
DROP POLICY IF EXISTS "Authenticated users can update candidate_documents" ON candidate_documents;

-- RLS policies
-- Allow service role full access
CREATE POLICY "Service role can do anything with candidate_documents"
  ON candidate_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read documents
CREATE POLICY "Authenticated users can read candidate_documents"
  ON candidate_documents
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create documents
CREATE POLICY "Authenticated users can create candidate_documents"
  ON candidate_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update documents
CREATE POLICY "Authenticated users can update candidate_documents"
  ON candidate_documents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete documents
CREATE POLICY "Authenticated users can delete candidate_documents"
  ON candidate_documents
  FOR DELETE
  TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE candidate_documents IS 'Stores Term Sheet documents for candidates to sign electronically';
COMMENT ON COLUMN candidate_documents.signing_token IS 'Unique token for the signing URL';
COMMENT ON COLUMN candidate_documents.access_password IS 'Password provided by HR for document access';
COMMENT ON COLUMN candidate_documents.probation_metrics IS 'JSON array of {metric, expected_result} objects';
COMMENT ON COLUMN candidate_documents.contacts IS 'JSON array of {name, position, responsibility} objects';
COMMENT ON COLUMN candidate_documents.signature_data IS 'Base64 PNG for drawn signatures, JSON for typed signatures';
