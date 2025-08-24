-- Bootstrap migration to create all missing tables and eliminate deployment prompts
-- This is idempotent and safe to re-run

-- 1) Helper: create uuid extension if not present
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Function: ensure a table exists by running provided DDL only when missing
CREATE OR REPLACE FUNCTION public.ensure_table(p_table_name text, p_create_sql text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    EXECUTE p_create_sql;
  END IF;
END $$;

-- 3) Ensure status_page_incidents (fix existing structure if needed)
SELECT public.ensure_table(
  'status_page_incidents',
  $SQL$
  CREATE TABLE public.status_page_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','minor','major','critical')),
    status text NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','identified','monitoring','resolved')),
    started_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_spi_started_at ON public.status_page_incidents (started_at DESC);
  $SQL$
);

-- 4) Ensure automated_runbooks
SELECT public.ensure_table(
  'automated_runbooks',
  $SQL$
  CREATE TABLE public.automated_runbooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    triggers jsonb DEFAULT '[]'::jsonb,         -- e.g., {type:'webhook'|'schedule'|'alert', ...}
    steps jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of typed step definitions
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_runbooks_active ON public.automated_runbooks (is_active);
  $SQL$
);

-- 5) Ensure oncall_teams
SELECT public.ensure_table(
  'oncall_teams',
  $SQL$
  CREATE TABLE public.oncall_teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    escalation_policy jsonb DEFAULT '{}'::jsonb,
    members jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{user_id, role, schedule}]
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_oncall_name ON public.oncall_teams (name);
  $SQL$
);

-- 6) Keep legacy telemetry tables if they already exist; only create if truly missing
SELECT public.ensure_table(
  'system_outages',
  $SQL$
  CREATE TABLE public.system_outages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    details text,
    impact text,                                  -- 'low'|'medium'|'high'
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_outages_started_at ON public.system_outages (started_at DESC);
  $SQL$
);

SELECT public.ensure_table(
  'system_status_checks',
  $SQL$
  CREATE TABLE public.system_status_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service text NOT NULL,
    endpoint text,
    ok boolean NOT NULL DEFAULT false,
    latency_ms integer,
    checked_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_status_checks_service_time ON public.system_status_checks (service, checked_at DESC);
  $SQL$
);

-- 7) Optional: a single updated_at trigger function reused by tables
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Attach to tables that have updated_at (safe if it's already attached)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='status_page_incidents' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_spi_updated_at') THEN
      EXECUTE 'CREATE TRIGGER tr_spi_updated_at BEFORE UPDATE ON public.status_page_incidents FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='automated_runbooks' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_runbooks_updated_at') THEN
      EXECUTE 'CREATE TRIGGER tr_runbooks_updated_at BEFORE UPDATE ON public.automated_runbooks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='oncall_teams' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_oncall_updated_at') THEN
      EXECUTE 'CREATE TRIGGER tr_oncall_updated_at BEFORE UPDATE ON public.oncall_teams FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='system_outages' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_outages_updated_at') THEN
      EXECUTE 'CREATE TRIGGER tr_outages_updated_at BEFORE UPDATE ON public.system_outages FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()';
    END IF;
  END IF;
END $$;

-- 8) Quick report: which expected tables were missing (for your logs)
WITH expected AS (
  SELECT unnest(ARRAY[
    'status_page_incidents',
    'automated_runbooks',
    'oncall_teams',
    'system_outages',
    'system_status_checks'
  ]) AS table_name
)
SELECT e.table_name AS created_if_missing
FROM expected e
LEFT JOIN information_schema.tables t
  ON t.table_schema='public' AND t.table_name=e.table_name
ORDER BY e.table_name;