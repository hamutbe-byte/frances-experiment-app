create table if not exists public.sessions (
  id text primary key,
  study_slug text not null,
  version_id text not null,
  version_number integer not null,
  recall_prompt_order integer[] not null,
  matching_trial_order integer[] not null,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz null,
  completion_code text not null,
  device jsonb not null,
  questionnaire jsonb null
);

create index if not exists sessions_study_slug_idx on public.sessions (study_slug);
create index if not exists sessions_status_idx on public.sessions (status);
create index if not exists sessions_created_at_idx on public.sessions (created_at desc);

create table if not exists public.comprehension_responses (
  session_id text not null references public.sessions (id) on delete cascade,
  study_slug text not null,
  version_id text not null,
  trial_index integer not null,
  answer text not null,
  correct boolean not null,
  response_time_ms integer not null,
  answered_at timestamptz not null,
  primary key (session_id, trial_index)
);

create index if not exists comprehension_responses_session_id_idx on public.comprehension_responses (session_id);

create table if not exists public.distractor_responses (
  session_id text not null references public.sessions (id) on delete cascade,
  trial_index integer not null,
  direction text not null,
  sequence_length integer not null,
  shown_sequence integer[] not null,
  response_sequence integer[] not null,
  correct boolean not null,
  response_time_ms integer not null,
  answered_at timestamptz not null,
  primary key (session_id, trial_index)
);

create index if not exists distractor_responses_session_id_idx on public.distractor_responses (session_id);

create table if not exists public.recall_responses (
  session_id text not null references public.sessions (id) on delete cascade,
  prompt_index integer not null,
  pseudoword text not null,
  text text not null,
  first_keystroke_latency_ms integer null,
  total_response_time_ms integer not null,
  edit_count integer not null,
  is_empty boolean not null,
  pasted boolean not null,
  paste_count integer not null,
  submitted_at timestamptz not null,
  primary key (session_id, prompt_index)
);

create index if not exists recall_responses_session_id_idx on public.recall_responses (session_id);

create table if not exists public.recognition_responses (
  session_id text not null references public.sessions (id) on delete cascade,
  prompt_index integer not null,
  pseudoword text not null,
  selected_option_index integer not null,
  selected_option_text text not null,
  correct boolean not null,
  response_time_ms integer not null,
  answered_at timestamptz not null,
  primary key (session_id, prompt_index)
);

create index if not exists recognition_responses_session_id_idx on public.recognition_responses (session_id);

create table if not exists public.matching_responses (
  session_id text not null references public.sessions (id) on delete cascade,
  trial_index integer not null,
  picture_id text not null,
  condition text not null,
  answer text not null,
  correct boolean not null,
  response_time_ms integer not null,
  answered_at timestamptz not null,
  primary key (session_id, trial_index)
);

create index if not exists matching_responses_session_id_idx on public.matching_responses (session_id);

create table if not exists public.telemetry_events (
  id bigserial primary key,
  session_id text not null references public.sessions (id) on delete cascade,
  stage text not null,
  event_type text not null,
  created_at timestamptz not null,
  payload jsonb not null
);

create index if not exists telemetry_events_session_id_idx on public.telemetry_events (session_id);
create index if not exists telemetry_events_created_at_idx on public.telemetry_events (created_at desc);
