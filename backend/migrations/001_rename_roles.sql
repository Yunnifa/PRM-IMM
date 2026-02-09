-- Migration: Rename role enum values (for user roles, NOT for meeting_requests columns)
-- head_ga -> head_dept (Head Department per departemen)
-- head_os -> ga (General Affairs)

-- NOTE: meeting_requests columns stay as head_ga and head_os in the database
-- The TypeScript code uses Drizzle's column mapping to use names headDept and ga

-- Step 1: Add new enum values
ALTER TYPE role ADD VALUE IF NOT EXISTS 'head_dept';
ALTER TYPE role ADD VALUE IF NOT EXISTS 'ga';

-- Note: PostgreSQL doesn't allow removing enum values directly
-- So we need to update existing users first, then the old values will be unused

-- Step 2: Update existing users with old roles to new roles
UPDATE users SET role = 'head_dept' WHERE role = 'head_ga';
UPDATE users SET role = 'ga' WHERE role = 'head_os';

-- Step 3 (Optional): If you want to completely remove old enum values, 
-- you would need to recreate the enum type, which is more complex.
-- For now, the old values (head_ga, head_os) will remain in the enum but unused.

-- Verify the changes
SELECT id, username, full_name, department, role FROM users WHERE role IN ('head_dept', 'ga', 'admin');
