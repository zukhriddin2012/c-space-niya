-- ============================================================================
-- DEV BOARD - Project Management for Platform Development
-- Only visible to general_manager role
-- ============================================================================

-- Projects (C-Space Niya, Telegram Bot, etc.)
CREATE TABLE IF NOT EXISTS dev_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8B5CF6', -- Purple default
  icon TEXT DEFAULT 'folder',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sprints (weekly/bi-weekly work periods)
CREATE TABLE IF NOT EXISTS dev_sprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks (features, bugs, improvements)
CREATE TABLE IF NOT EXISTS dev_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES dev_projects(id) ON DELETE SET NULL,
  sprint_id UUID REFERENCES dev_sprints(id) ON DELETE SET NULL,

  -- Status: backlog -> todo -> in_progress -> testing -> done
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'testing', 'done')),

  -- Type: feature, bug, improvement, task
  task_type TEXT DEFAULT 'feature' CHECK (task_type IN ('feature', 'bug', 'improvement', 'task')),

  -- Priority: P0 (critical) -> P3 (low)
  priority TEXT DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),

  -- Category/Label for filtering
  category TEXT, -- e.g., 'attendance', 'recruitment', 'payroll', 'bot'

  -- Effort estimate (in hours or story points)
  estimate TEXT, -- e.g., '2h', '1d', '1w'

  -- Dates
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Ordering within column
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Comments (discussion, updates, notes)
CREATE TABLE IF NOT EXISTS dev_task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES dev_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL, -- 'user' or 'claude'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Activity Log (status changes, edits)
CREATE TABLE IF NOT EXISTS dev_task_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES dev_tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'status_changed', 'edited', 'commented'
  old_value TEXT,
  new_value TEXT,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_dev_tasks_project ON dev_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_sprint ON dev_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_status ON dev_tasks(status);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_priority ON dev_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_dev_task_comments_task ON dev_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_dev_task_activity_task ON dev_task_activity(task_id);

-- ============================================================================
-- INSERT DEFAULT PROJECTS
-- ============================================================================
INSERT INTO dev_projects (id, name, description, color, icon) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Niya Platform', 'C-Space Niya - HR & Operations', '#8B5CF6', 'building'),
  ('22222222-2222-2222-2222-222222222222', 'Telegram Bot', 'Attendance & Check-in Bot', '#10B981', 'message-circle')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSERT CURRENT SPRINT
-- ============================================================================
INSERT INTO dev_sprints (id, name, goal, start_date, end_date, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sprint 1 - Jan 25', 'Quick wins & Dev Board setup', '2026-01-25', '2026-01-31', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSERT SAMPLE TASKS (from current work)
-- Only insert if table is empty (first run)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dev_tasks LIMIT 1) THEN
    -- Completed tasks
    INSERT INTO dev_tasks (title, description, project_id, sprint_id, status, task_type, priority, category, completed_at) VALUES
      ('Employee Self-Service Profile Edit', 'Allow employees to edit phone and email from My Portal', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'done', 'feature', 'P0', 'my-portal', NOW()),
      ('Fix FK Ambiguity Error', 'Resolve PGRST201 error with branches relationship', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'done', 'bug', 'P0', 'database', NOW()),
      ('Fix Present Count Bug', 'Count unique employees instead of check-in records', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'done', 'bug', 'P0', 'attendance', NOW()),
      ('Branch Configuration UI', 'Add operational status, class, CM assignment to branches', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'done', 'feature', 'P1', 'branches', NOW()),
      ('Quick Switch Panel', 'Floating button to switch test accounts instantly', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'done', 'feature', 'P0', 'dev-tools', NOW()),
      ('Fix Bot Sessions Display', 'Bot showing "-" for sessions due to FK ambiguity', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'done', 'bug', 'P0', 'bot', NOW()),
      -- In progress
      ('Dev Board Feature', 'Project management board for platform development', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'done', 'feature', 'P1', 'dev-tools', NOW());

    -- Backlog items (from BACKLOG.md)
    INSERT INTO dev_tasks (title, description, project_id, status, task_type, priority, category, estimate) VALUES
      ('Pipeline Filters', 'Filter candidates by stage, source, date, recruiter', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P0', 'recruitment', '1d'),
      ('Bulk Actions for Candidates', 'Move/reject multiple candidates at once', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P0', 'recruitment', '1d'),
      ('Shift Notes', 'Add instructions or notes to specific shifts', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P0', 'attendance', '1d'),
      ('Visual Shift Calendar', 'See all shifts across all branches in one view', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P1', 'attendance', '4d'),
      ('Employee Timeline', 'Track promotions, achievements, role changes', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P1', 'employees', '4d'),
      ('Stage Duration Tracking', 'How long candidates stay in each stage', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P1', 'recruitment', '2d'),
      ('1:1 Meetings Tracking', 'Track meeting history and notes with employees', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P2', 'hr', '1w'),
      ('Employee Directory & Org Chart', 'Visual company structure with search', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P1', 'employees', '5d'),
      ('No-Show Tracking', 'Flag when employees dont show up for shifts', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P1', 'attendance', '3d'),
      ('Engagement Surveys', 'Pulse checks and anonymous feedback', '11111111-1111-1111-1111-111111111111', 'backlog', 'feature', 'P2', 'hr', '1w');
  END IF;
END $$;

-- ============================================================================
-- TRIGGER FUNCTION (create if not exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
DROP TRIGGER IF EXISTS update_dev_tasks_updated_at ON dev_tasks;
CREATE TRIGGER update_dev_tasks_updated_at
    BEFORE UPDATE ON dev_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dev_sprints_updated_at ON dev_sprints;
CREATE TRIGGER update_dev_sprints_updated_at
    BEFORE UPDATE ON dev_sprints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dev_projects_updated_at ON dev_projects;
CREATE TRIGGER update_dev_projects_updated_at
    BEFORE UPDATE ON dev_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
