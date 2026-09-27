alter table public.qa_evaluations
  add column if not exists ai_status text check (ai_status in ('pass','ko','needs_review')),
  add column if not exists applicable_score numeric(5,2),
  add column if not exists applicable_max_score numeric(5,2),
  add column if not exists positive_feedback jsonb not null default '[]'::jsonb,
  add column if not exists impact jsonb not null default '[]'::jsonb,
  add column if not exists recommendation jsonb not null default '[]'::jsonb,
  add column if not exists infractions jsonb not null default '[]'::jsonb,
  add column if not exists feedback text,
  add column if not exists scorecard_version text;

alter table public.qa_criteria_results
  add column if not exists answer text,
  add column if not exists critical boolean not null default false,
  add column if not exists infractions jsonb not null default '[]'::jsonb;

create index if not exists qa_evaluations_created_at_idx
  on public.qa_evaluations(user_id, created_at desc);

create index if not exists qa_criteria_results_evaluation_id_idx
  on public.qa_criteria_results(evaluation_id);
