-- =========================================================================
-- Resource Pulse · Supabase Database Schema
-- Run this in your Supabase Project: SQL Editor -> New query -> Run
-- Project: vfvwviprodmoqqsxzfva
-- =========================================================================

-- 1. Task Assignments Table
create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  person text not null,
  task text not null,
  priority text default 'High',
  status text default 'pending_approval',
  assigned_at timestamptz default now()
);

-- Enable RLS & allow public read/write with anon key
alter table public.task_assignments enable row level security;
create policy "Allow anon all on task_assignments" on public.task_assignments
  for all using (true) with check (true);

-- 2. Approvals & Governance Audit Trail Table
create table if not exists public.approvals_audit_log (
  id uuid primary key default gen_random_uuid(),
  decision_id text not null,
  approved_by text not null,
  action text default 'APPROVED',
  details text,
  approved_at timestamptz default now()
);

alter table public.approvals_audit_log enable row level security;
create policy "Allow anon all on approvals_audit_log" on public.approvals_audit_log
  for all using (true) with check (true);

-- 3. Executive AI Simulations Table
create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  absent_person text not null,
  time_recovered text,
  risk_reduction text,
  estimated_cost text,
  recommended_candidate text,
  simulated_at timestamptz default now()
);

alter table public.simulations enable row level security;
create policy "Allow anon all on simulations" on public.simulations
  for all using (true) with check (true);

-- 4. Copilot Chat History Table
create table if not exists public.copilot_chat (
  id uuid primary key default gen_random_uuid(),
  sender text not null check (sender in ('user', 'ai')),
  message text not null,
  created_at timestamptz default now()
);

alter table public.copilot_chat enable row level security;
create policy "Allow anon all on copilot_chat" on public.copilot_chat
  for all using (true) with check (true);
