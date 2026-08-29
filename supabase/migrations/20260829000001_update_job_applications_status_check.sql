-- Update job_applications check constraint to include all 7 lifecycle statuses
alter table public.job_applications
  drop constraint if exists job_applications_status_check;

alter table public.job_applications
  add constraint job_applications_status_check
  check (status in ('saved', 'applied', 'screening', 'assessment', 'interview', 'rejected', 'offer'));

-- Add interview_date column if not exists
alter table public.job_applications
  add column if not exists interview_date timestamptz;
