-- SAFE MIGRATION TEMPLATE: Two-Step Pattern for Heavy Operations
-- Use this template for operations that could cause table locks

BEGIN;

-- STEP 1: Add nullable column (fast, non-blocking)
-- Example: ALTER TABLE users ADD COLUMN email_verified boolean;

-- STEP 2: Set default value for new rows (fast)
-- Example: ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;

-- NOTE: Do NOT use SET NOT NULL in this migration!
-- Instead, create a follow-up migration for STEP 3

COMMIT;

-- STEP 3 MIGRATION (run separately after backfill):
-- Example file: 0002_set_email_verified_not_null.sql
/*
BEGIN;

-- Backfill existing NULL values first (can be done in batches)
UPDATE users SET email_verified = false WHERE email_verified IS NULL;

-- Only after backfill is complete:
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

COMMIT;
*/

-- SAFE PATTERNS TO AVOID BLOCKING:
-- ✅ DO: ADD COLUMN (nullable)
-- ✅ DO: CREATE TABLE
-- ✅ DO: CREATE INDEX CONCURRENTLY (PostgreSQL 11+)
-- ✅ DO: DROP INDEX
-- ❌ AVOID: ALTER COLUMN SET NOT NULL (without backfill)
-- ❌ AVOID: ADD COLUMN ... NOT NULL (on large tables)
-- ❌ AVOID: DROP COLUMN (on large tables)
-- ❌ AVOID: RENAME TABLE (if app doesn't handle both names)