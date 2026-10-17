-- The idea board (src/suggestions.ts). Only adds, so the previous API keeps working during a rollout.

-- One row per idea. `status`: `open`, `done` (the admin marked it shipped) or `hidden` (taken off the board).
-- `score` is up votes minus down votes, recounted from `suggestion_votes` on every vote.
create table suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users (id) on delete cascade,
  title text not null,
  body text not null default '',
  status text not null default 'open' check (status in ('open', 'done', 'hidden')),
  score integer not null default 0,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

-- The tabs: open ideas by votes and by date, and the shipped ones by when they shipped.
create index suggestions_top on suggestions (score desc, created_at desc) where status = 'open';
create index suggestions_new on suggestions (created_at desc) where status = 'open';
create index suggestions_done on suggestions (done_at desc) where status = 'done';
-- How many ideas a player posted lately (`SUGGESTION.perDay`).
create index suggestions_author on suggestions (user_id, created_at desc);

-- One vote per player per idea: 1 up, -1 down. Taking a vote back deletes its row.
create table suggestion_votes (
  suggestion_id uuid not null references suggestions (id) on delete cascade,
  user_id text not null references users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  voted_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);
