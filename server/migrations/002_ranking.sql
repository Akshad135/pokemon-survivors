-- Ranking: public profiles, ranked runs and follows. Only adds, so the previous API keeps working during a rollout.

-- The profile a player picks on signing in. Null until they do; the boards only list players with a handle.
alter table users
  add column handle text,
  add column name text;

-- Handles are stored lower case (`parseHandle` in src/game/ranking.ts).
create unique index users_handle on users (handle);

-- One row per ranked run. It's created when the run starts (its id is the start
-- token the game keeps) and filled when the run ends; unfinished rows never show.
create table runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- `RunResult` (src/game/ranking.ts), null until the run ends.
  starter text,
  stage smallint,
  difficulty text,
  survived double precision,
  outcome text,
  level integer,
  kills integer,
  version text
);

-- Best run per player on a difficulty (the Total board, records on profiles).
create index runs_best on runs (difficulty, user_id, survived desc) where finished_at is not null;
-- Day and week boards: runs of a difficulty since a moment.
create index runs_period on runs (difficulty, started_at) where finished_at is not null;
-- A player's runs: recent runs on the profile, the start rate limit.
create index runs_user on runs (user_id, started_at desc);

-- One way: following someone needs no answer from them. "Friends" are who I follow, plus me.
create table follows (
  follower_id text not null references users (id) on delete cascade,
  followee_id text not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee on follows (followee_id);
