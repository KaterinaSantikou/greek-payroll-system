-- Create unified status_page_incidents table for Status Page / Incident management
-- This approach creates a fresh table without touching existing related tables

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- Create the new unified incidents table
CREATE TABLE IF NOT EXISTS public.status_page_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','minor','major','critical')),
  status text NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','identified','monitoring','resolved')),
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid, -- optional FK to users table if you have one
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for performance on most common query pattern
CREATE INDEX IF NOT EXISTS idx_status_page_incidents_started_at ON public.status_page_incidents(started_at DESC);

-- Create updated_at trigger function
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