-- ═══════════════════════════════════════════════════════════
-- ARENA — Supabase schema
-- Apply via Supabase Studio SQL editor or `psql -f schema.sql`
-- ═══════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "pgcrypto";

-- ─── arena_runs ───────────────────────────────────────────────
-- One row per end-to-end Arena execution.
create table if not exists public.arena_runs (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  brand                 text not null,
  project_id            text not null,                   -- Peec project id (or_...)
  prompt_focus          text,                            -- optional single-prompt narrowing
  status                text not null default 'idle'
                         check (status in ('idle','ingesting','round-1','round-2','synthesizing','done','error')),
  total_cost_usd        numeric(10,4) not null default 0,
  total_tokens          integer not null default 0,
  duration_ms           integer not null default 0,
  peec_chats_analyzed   integer not null default 0,
  peec_urls_scraped     integer not null default 0,
  consensus_patterns    integer not null default 0,
  dissent_flags         integer not null default 0,
  summary               text,
  error_message         text
);
create index if not exists arena_runs_created_at_idx on public.arena_runs (created_at desc);
create index if not exists arena_runs_brand_idx       on public.arena_runs (brand);
create index if not exists arena_runs_status_idx      on public.arena_runs (status);

-- ─── arena_agents ─────────────────────────────────────────────
-- One row per (run, model family, phase). 3 rounds × 4 agents = 12 rows per run.
create table if not exists public.arena_agents (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references public.arena_runs(id) on delete cascade,
  family           text not null check (family in ('gpt','claude','grok')),
  model_id         text not null,
  phase            text not null check (phase in ('round-1','round-2','synthesis')),
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  tokens_in        integer not null default 0,
  tokens_out       integer not null default 0,
  cost_usd         numeric(10,4) not null default 0,
  reasoning_depth  integer,                              -- 1-10 post-hoc score
  confidence       numeric(3,2),                         -- 0.00-1.00
  content          text not null,
  patterns         text[] not null default '{}'
);
create index if not exists arena_agents_run_idx on public.arena_agents (run_id, phase);

-- ─── arena_verdicts ───────────────────────────────────────────
-- Arena's adversarial verdict on each Peec-generated action.
create table if not exists public.arena_verdicts (
  id                   uuid primary key default gen_random_uuid(),
  run_id               uuid not null references public.arena_runs(id) on delete cascade,
  peec_action_id       text not null,
  peec_action_summary  text not null,
  peec_score           integer not null,                 -- Peec 1-3
  arena_verdict        text not null check (arena_verdict in ('HIGH','PARTIAL','LOW','BLOCKED')),
  consensus_count      integer not null check (consensus_count between 0 and 4),
  reasoning            text not null,
  refinements          text[] not null default '{}'
);
create index if not exists arena_verdicts_run_idx on public.arena_verdicts (run_id);

-- ─── arena_citations ──────────────────────────────────────────
-- Scraped URLs the Arena debated over. From peec-ai get_url_content.
create table if not exists public.arena_citations (
  id                    uuid primary key default gen_random_uuid(),
  run_id                uuid not null references public.arena_runs(id) on delete cascade,
  url                   text not null,
  domain                text not null,
  peec_citation_count   integer not null default 0,
  peec_citation_rate    numeric(6,2) not null default 0,
  domain_type           text not null check (domain_type in ('Corporate','Reference','UGC','Editorial','Other','Institutional','Competitor')),
  extracted_patterns    text[] not null default '{}',
  content_snippet       text
);
create index if not exists arena_citations_run_idx on public.arena_citations (run_id);

-- ─── RLS (public read; writes via service role) ───────────────
alter table public.arena_runs       enable row level security;
alter table public.arena_agents     enable row level security;
alter table public.arena_verdicts   enable row level security;
alter table public.arena_citations  enable row level security;

drop policy if exists "public read arena_runs"      on public.arena_runs;
drop policy if exists "public read arena_agents"    on public.arena_agents;
drop policy if exists "public read arena_verdicts"  on public.arena_verdicts;
drop policy if exists "public read arena_citations" on public.arena_citations;

create policy "public read arena_runs"      on public.arena_runs      for select using (true);
create policy "public read arena_agents"    on public.arena_agents    for select using (true);
create policy "public read arena_verdicts"  on public.arena_verdicts  for select using (true);
create policy "public read arena_citations" on public.arena_citations for select using (true);

-- Writes only via service role key (server orchestrator). No public insert/update/delete policies.
