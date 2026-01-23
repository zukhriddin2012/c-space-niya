-- ============================================================================
-- ALL MIGRATIONS FOR C-SPACE HR SYSTEM
-- Run this AFTER running base_schema.sql
-- ============================================================================

-- ============================================================================
-- Migration: 20240120_branch_wages.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_branch_wages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  wage_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_branch_wages_employee ON employee_branch_wages(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_branch_wages_branch ON employee_branch_wages(branch_id);

-- ============================================================================
-- Migration: 20240120_payment_requests.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('advance', 'wage')),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  legal_entity_id VARCHAR(50) REFERENCES legal_entities(id),
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'paid')),
  created_by VARCHAR(50) NOT NULL,
  submitted_at TIMESTAMPTZ,
  approved_by VARCHAR(50),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  legal_entity_id VARCHAR(50) REFERENCES legal_entities(id),
  amount DECIMAL(15, 2) NOT NULL,
  net_salary DECIMAL(15, 2),
  advance_paid DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS advance_paid DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS wage_paid DECIMAL(15, 2) DEFAULT 0;

-- ============================================================================
-- Migration: 20240121_add_system_role.sql
-- ============================================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS system_role TEXT DEFAULT 'employee';
CREATE INDEX IF NOT EXISTS idx_employees_system_role ON employees(system_role);

-- ============================================================================
-- Migration: 20240122_add_password.sql
-- ============================================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password TEXT;

-- ============================================================================
-- Migration: 20240124_employee_documents.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  uploaded_by UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);

-- ============================================================================
-- Migration: 20240125_termination_requests.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS termination_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES employees(id),
  reason TEXT NOT NULL,
  termination_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES employees(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- Migration: 20250119_feedback.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL CHECK (category IN ('work_environment', 'management', 'career', 'compensation', 'suggestion', 'other')),
  feedback_text TEXT NOT NULL,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'read', 'acknowledged')),
  read_by UUID REFERENCES employees(id),
  read_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES employees(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  response_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Migration: 20250119_wage_change_requests.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS wage_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  wage_type TEXT NOT NULL CHECK (wage_type IN ('primary', 'additional')),
  legal_entity_id TEXT,
  branch_id TEXT,
  current_amount DECIMAL(15, 2) NOT NULL,
  proposed_amount DECIMAL(15, 2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('increase', 'decrease')),
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES employees(id),
  approved_by UUID REFERENCES employees(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- Migration: 20250120_candidates.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  iq_score INTEGER,
  mbti_type TEXT CHECK (mbti_type IS NULL OR mbti_type IN (
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP'
  )),
  applied_role TEXT NOT NULL,
  about TEXT,
  resume_file_name TEXT,
  resume_file_path TEXT,
  resume_file_size INTEGER,
  stage TEXT NOT NULL DEFAULT 'screening' CHECK (stage IN ('screening', 'interview_1', 'interview_2', 'under_review', 'probation', 'hired', 'rejected')),
  probation_employee_id UUID REFERENCES employees(id),
  probation_start_date DATE,
  probation_end_date DATE,
  checklist JSONB DEFAULT '[]',
  source TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- ============================================================================
-- Migration: 20250120_recruitment_files.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS recruitment_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  category TEXT NOT NULL,
  role TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Migration: 20250121_recruitment_enhancements.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES employees(id),
  content TEXT NOT NULL,
  stage_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'interview' CHECK (event_type IN ('interview', 'meeting', 'deadline', 'review', 'signing', 'other')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  with_user_id UUID REFERENCES employees(id),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS next_event_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS next_event_title TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS term_sheet_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS probation_account_created BOOLEAN DEFAULT FALSE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- ============================================================================
-- Migration: 20250123_ip_verification.sql
-- ============================================================================
ALTER TABLE branches ADD COLUMN IF NOT EXISTS office_ips TEXT[] DEFAULT '{}';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verification_type VARCHAR(10) DEFAULT 'gps';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- ============================================================================
-- Migration: 20250123_candidate_documents.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL DEFAULT 'Условия трудоустройства',
  candidate_name VARCHAR(255),
  position VARCHAR(100),
  branch_id TEXT REFERENCES branches(id),
  branch_name VARCHAR(100),
  branch_address TEXT,
  reporting_to VARCHAR(100),
  screening_passed BOOLEAN DEFAULT true,
  interview1_passed BOOLEAN DEFAULT true,
  interview2_passed BOOLEAN DEFAULT false,
  contract_type VARCHAR(100) DEFAULT 'Трудовой договор на 1 год',
  contract_duration VARCHAR(50),
  start_date DATE,
  salary VARCHAR(50),
  salary_review VARCHAR(255),
  probation_duration VARCHAR(50),
  probation_start_date DATE,
  probation_end_date DATE,
  working_hours VARCHAR(50),
  probation_salary VARCHAR(100),
  probation_metrics JSONB DEFAULT '[]'::jsonb,
  final_interview_date DATE,
  final_interview_time VARCHAR(10),
  final_interview_interviewer VARCHAR(255),
  final_interview_purpose TEXT,
  onboarding_weeks JSONB DEFAULT '[]'::jsonb,
  contacts JSONB DEFAULT '[]'::jsonb,
  escalation_contact VARCHAR(255),
  escalation_contact_position VARCHAR(100),
  representative_name VARCHAR(255),
  representative_position VARCHAR(100),
  signing_token VARCHAR(64) UNIQUE NOT NULL,
  access_password VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'pending', 'sent', 'viewed', 'signed', 'expired')),
  signature_type VARCHAR(20) CHECK (signature_type IN ('draw', 'type')),
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  signer_ip VARCHAR(50),
  signer_user_agent TEXT,
  pdf_file_path TEXT,
  pdf_file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_candidate_documents_candidate ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_token ON candidate_documents(signing_token);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_status ON candidate_documents(status);

-- ============================================================================
-- Migration: 20250124_recruiter_signature.sql
-- ============================================================================
ALTER TABLE candidate_documents
ADD COLUMN IF NOT EXISTS recruiter_signature_type VARCHAR(20) CHECK (recruiter_signature_type IN ('draw', 'type')),
ADD COLUMN IF NOT EXISTS recruiter_signature_data TEXT,
ADD COLUMN IF NOT EXISTS recruiter_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recruiter_signed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS recruiter_signed_by_position VARCHAR(100);

-- ============================================================================
-- Migration: 20250125_ai_analysis.sql
-- HR AI feature for resume analysis with Claude
-- ============================================================================
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for faster lookups of analyzed candidates
CREATE INDEX IF NOT EXISTS idx_candidates_ai_analyzed
ON candidates (ai_analyzed_at)
WHERE ai_analyzed_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN candidates.ai_analysis IS 'AI-generated analysis of candidate resume including skills, experience, role fit, and interview questions';
COMMENT ON COLUMN candidates.ai_analyzed_at IS 'Timestamp when the AI analysis was last performed';

-- ============================================================================
-- END OF MIGRATIONS
-- ============================================================================
