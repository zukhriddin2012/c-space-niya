-- Add AI analysis fields to candidates table
-- HR AI feature for resume analysis with Claude

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
