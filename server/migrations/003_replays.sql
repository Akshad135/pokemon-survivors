-- Re-simulation: a ranked run's replay and whether replaying it on the server
-- ended where the player said. Only adds, so the previous API keeps working.
alter table runs
  -- `Replay` (src/game/replay.ts). Dropped once the run is verified; kept when it fails, to look into.
  add column replay jsonb,
  -- Null while pending (or for runs sent without a replay), then true or false.
  add column verified boolean,
  add column checked_at timestamptz,
  -- Milliseconds the re-simulation took.
  add column check_ms integer;

-- Runs waiting for a check, picked up again after a restart.
create index runs_unchecked on runs (finished_at) where verified is null and replay is not null;
