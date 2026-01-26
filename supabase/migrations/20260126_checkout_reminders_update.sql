-- Update checkout_reminders table for IP verification flow
-- Run this after the initial telegram_bot_content migration

-- Add scheduled_for column for scheduled reminders
ALTER TABLE checkout_reminders
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ DEFAULT NULL;

-- Update status check constraint to include 'scheduled' and 'completed'
ALTER TABLE checkout_reminders
DROP CONSTRAINT IF EXISTS checkout_reminders_status_check;

ALTER TABLE checkout_reminders
ADD CONSTRAINT checkout_reminders_status_check
CHECK (status IN ('pending', 'sent', 'scheduled', 'responded', 'completed', 'auto_completed'));

-- Update response_type check constraint for new response types
ALTER TABLE checkout_reminders
DROP CONSTRAINT IF EXISTS checkout_reminders_response_type_check;

ALTER TABLE checkout_reminders
ADD CONSTRAINT checkout_reminders_response_type_check
CHECK (response_type IN ('im_at_work', 'i_left', '45min', '2hours', 'all_day', 'confirmed', 'in_office', 'left', 'auto'));

-- Create index for scheduled reminders
CREATE INDEX IF NOT EXISTS idx_checkout_reminders_scheduled
ON checkout_reminders(scheduled_for)
WHERE status = 'scheduled';

-- Add checkout_type to attendance table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'checkout_type'
  ) THEN
    ALTER TABLE attendance ADD COLUMN checkout_type VARCHAR(30) DEFAULT 'manual';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN checkout_reminders.scheduled_for IS 'When the next reminder should be sent (for scheduled reminders)';
COMMENT ON COLUMN checkout_reminders.status IS 'pending: created but not sent, sent: message sent waiting for response, scheduled: waiting for scheduled time, responded: user responded, completed: checkout done, auto_completed: auto checkout done';
