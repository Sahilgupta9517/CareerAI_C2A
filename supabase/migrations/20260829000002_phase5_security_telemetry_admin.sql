-- PHASE 5: PRODUCTION SECURITY, AI OBSERVABILITY & ADMIN TELEMETRY

-- 1. Add is_admin column to profiles if not exists
alter table public.profiles
  add column if not exists is_admin boolean default false;

-- 2. AI Request Telemetry Logs Table
create table if not exists public.ai_request_logs (
  id bigserial primary key,
  profile_id bigint references public.profiles(id) on delete set null,
  feature text not null,
  provider text not null,
  model text,
  status text not null check (status in ('success', 'failure', 'fallback', 'timeout', 'rate_limit')),
  status_code integer,
  duration_ms integer not null default 0,
  fallback_used boolean default false,
  created_at timestamptz default now()
);

-- Index for telemetry queries
create index if not exists idx_ai_request_logs_feature on public.ai_request_logs(feature);
create index if not exists idx_ai_request_logs_provider on public.ai_request_logs(provider);
create index if not exists idx_ai_request_logs_created_at on public.ai_request_logs(created_at desc);

-- 3. System Audit Logs Table
create table if not exists public.audit_logs (
  id bigserial primary key,
  profile_id bigint references public.profiles(id) on delete set null,
  event text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- Index for audit logs
create index if not exists idx_audit_logs_event on public.audit_logs(event);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- 4. System Error Telemetry Table
create table if not exists public.system_errors (
  id bigserial primary key,
  endpoint text not null,
  feature text not null,
  category text not null check (category in ('429', '500', 'timeout', 'malformed_response', 'auth_error')),
  message text,
  created_at timestamptz default now()
);

-- Index for system errors
create index if not exists idx_system_errors_created_at on public.system_errors(created_at desc);

-- Enable RLS on telemetry tables
alter table public.ai_request_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_errors enable row level security;

-- RLS Policies for ai_request_logs
drop policy if exists "Admins can view all AI logs" on public.ai_request_logs;
create policy "Admins can view all AI logs" on public.ai_request_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.is_admin = true
    )
  );

drop policy if exists "Users can insert AI logs" on public.ai_request_logs;
create policy "Users can insert AI logs" on public.ai_request_logs
  for insert
  to authenticated
  with check (true);

-- RLS Policies for audit_logs
drop policy if exists "Admins can view all audit logs" on public.audit_logs;
create policy "Admins can view all audit logs" on public.audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.is_admin = true
    )
  );

drop policy if exists "Users can insert audit logs" on public.audit_logs;
create policy "Users can insert audit logs" on public.audit_logs
  for insert
  to authenticated
  with check (true);

-- RLS Policies for system_errors
drop policy if exists "Admins can view all system errors" on public.system_errors;
create policy "Admins can view all system errors" on public.system_errors
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.is_admin = true
    )
  );

drop policy if exists "Authenticated users can insert system errors" on public.system_errors;
create policy "Authenticated users can insert system errors" on public.system_errors
  for insert
  to authenticated
  with check (true);
