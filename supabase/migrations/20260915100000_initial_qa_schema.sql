create extension if not exists pgcrypto;
create table if not exists public.qa_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_mode text not null check (input_mode in ('paste','listen','camera')),
  ticket_id text,
  agent_name text,
  issue text not null,
  outcome text,
  overall_ai_score numeric(5,2),
  overall_final_score numeric(5,2),
  status text not null default 'draft' check (status in ('draft','reviewed','approved')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.qa_evaluations enable row level security;
create policy "users manage own evaluations" on public.qa_evaluations for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table if not exists public.qa_criteria_results (
  id uuid primary key default gen_random_uuid(), evaluation_id uuid not null references public.qa_evaluations(id) on delete cascade,
  criterion_key text not null, criterion_name text not null, ai_score numeric(5,2) not null, final_score numeric(5,2), max_score numeric(5,2) not null,
  finding text not null, evidence jsonb not null default '[]'::jsonb, policy_reference text, confidence text not null check (confidence in ('high','medium','low')),
  overridden boolean not null default false, override_reason text, created_at timestamptz not null default now()
);
alter table public.qa_criteria_results enable row level security;
create policy "users manage own criterion results" on public.qa_criteria_results for all to authenticated using (exists(select 1 from public.qa_evaluations e where e.id=evaluation_id and e.user_id=auth.uid())) with check (exists(select 1 from public.qa_evaluations e where e.id=evaluation_id and e.user_id=auth.uid()));
create table if not exists public.qa_knowledge_documents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text not null, category text not null,
  version text not null default '1.0', effective_from date, effective_until date, content text not null, status text not null default 'active', created_at timestamptz not null default now()
);
alter table public.qa_knowledge_documents enable row level security;
create policy "users manage own knowledge" on public.qa_knowledge_documents for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
