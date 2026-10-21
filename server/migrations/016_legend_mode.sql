-- Legend mode: a run played with a legend goes on its own boards ("Lendário"),
-- split by difficulty like the rest. The mode is written by the API from the
-- Pokémon played (`runMode` in src/game/ranking.ts); every run before this is
-- a regular one. Adding a column with a constant default doesn't rewrite the table.
alter table runs
  add column mode text not null default 'standard';

-- The boards and records now pick a mode first, then a difficulty.
create index runs_mode_best on runs (mode, difficulty, user_id, survived desc) where finished_at is not null;
create index runs_mode_period on runs (mode, difficulty, started_at) where finished_at is not null;
drop index if exists runs_best;
drop index if exists runs_period;
