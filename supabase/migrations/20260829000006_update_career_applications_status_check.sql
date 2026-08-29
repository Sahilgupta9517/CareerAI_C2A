-- Migration: Update career_job_applications status check constraint and add columns for recruiter notes and follow-up
-- Isolated, non-destructive migration.

-- 1. Drop existing constraint
ALTER TABLE public.career_job_applications
  DROP CONSTRAINT IF EXISTS career_job_applications_status_check;

-- 2. Add updated status check constraint supporting all 10 statuses
ALTER TABLE public.career_job_applications
  ADD CONSTRAINT career_job_applications_status_check
  CHECK (status IN ('interested', 'saved', 'applied', 'screening', 'interview', 'technical_round', 'final_round', 'offer', 'rejected', 'withdrawn'));

-- 3. Add new fields if they don't already exist
ALTER TABLE public.career_job_applications
  ADD COLUMN IF NOT EXISTS recruiter_notes text,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz;
