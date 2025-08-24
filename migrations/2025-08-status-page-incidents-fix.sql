-- Fix status_page_incidents table structure to match expected schema
-- Add missing columns without breaking existing data

BEGIN;

-- Add missing columns to existing status_page_incidents table
ALTER TABLE public.status_page_incidents 
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create index for performance on most common query pattern
CREATE INDEX IF NOT EXISTS idx_status_page_incidents_started_at ON public.status_page_incidents(started_at DESC);

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION public.tg_status_page_incidents_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS tr_status_page_incidents_updated_at ON public.status_page_incidents;
CREATE TRIGGER tr_status_page_incidents_updated_at
BEFORE UPDATE ON public.status_page_incidents
FOR EACH ROW EXECUTE FUNCTION public.tg_status_page_incidents_updated_at();

COMMIT;