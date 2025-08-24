BEGIN;

-- DR / SLA analytics
ALTER TABLE IF EXISTS public.dr_slas
  ADD COLUMN IF NOT EXISTS last_rpo_breach timestamptz,
  ADD COLUMN IF NOT EXISTS performance_metrics jsonb,  -- e.g., {"rto_p50":..., "rto_p95":...}
  ADD COLUMN IF NOT EXISTS current_status varchar DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS compliance_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_contacts jsonb DEFAULT '[]'::jsonb;

-- On-call escalation UX
ALTER TABLE IF EXISTS public.escalation_policies
  ADD COLUMN IF NOT EXISTS weekend_escalation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_escalation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_resolve boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_resolve_time_minutes integer DEFAULT 30;

-- WORM objects missing columns
ALTER TABLE IF EXISTS public.worm_objects
  ADD COLUMN IF NOT EXISTS created_by varchar,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tamper_attempts integer DEFAULT 0;

-- Restore tests missing columns  
ALTER TABLE IF EXISTS public.restore_tests
  ADD COLUMN IF NOT EXISTS performance_metrics jsonb,
  ADD COLUMN IF NOT EXISTS data_integrity_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_rto_minutes integer,
  ADD COLUMN IF NOT EXISTS actual_rpo_minutes integer;

-- Automated runbooks missing columns
ALTER TABLE IF EXISTS public.runbook_triggers
  ADD COLUMN IF NOT EXISTS timezone varchar DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS cooldown_period_minutes integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_executions_per_hour integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS requires_confirmation boolean DEFAULT false;

COMMIT;