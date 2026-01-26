-- Add preferred_language column to employees table
-- This stores the user's language preference for Telegram bot messages

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'uz';

-- Add check constraint for valid languages
ALTER TABLE employees
DROP CONSTRAINT IF EXISTS employees_preferred_language_check;

ALTER TABLE employees
ADD CONSTRAINT employees_preferred_language_check
CHECK (preferred_language IN ('uz', 'ru', 'en'));

-- Comment for documentation
COMMENT ON COLUMN employees.preferred_language IS 'Preferred language for bot messages: uz (Uzbek), ru (Russian), en (English)';
