-- Reports and bans (src/moderation.ts, server/README.md "Reports and bans"). Only adds, so the previous API keeps working during a rollout.

-- A banned account: since when and why (the admin's words). Null for everyone else.
alter table users
  add column banned_at timestamptz,
  add column banned_reason text;

-- One row per report a player sent (`POST /reports`), about a run on the boards or a player.
-- `run_id`: the run it's about, null when it's about the player (their name, their save).
-- `resolution`: what the admin did about it (`ModerationAction` in src/game/reports.ts), with who and when.
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null references users (id) on delete cascade,
  target_id text not null references users (id) on delete cascade,
  run_id uuid references runs (id) on delete cascade,
  reason text not null check (reason in ('cheating', 'name', 'other')),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text references users (id) on delete set null,
  resolution text check (resolution in ('remove', 'reset', 'ban', 'unban', 'dismiss')),
  check (reporter_id <> target_id)
);

-- One report per reporter per run, or per reporter per player when there's no run.
create unique index reports_once_run on reports (reporter_id, run_id) where run_id is not null;
create unique index reports_once_player on reports (reporter_id, target_id) where run_id is null;
-- The admin's open list, and resolving a player's or a run's reports (and the cascade when a run row goes).
create index reports_open on reports (target_id, created_at) where resolved_at is null;
create index reports_run on reports (run_id) where run_id is not null;
-- How many a player sent lately (`REPORT.perDay`).
create index reports_reporter on reports (reporter_id, created_at desc);
