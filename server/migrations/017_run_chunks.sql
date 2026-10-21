-- Replay streaming: a ranked run's replay reaches the API in chunks while it plays (src/game/replayStream.ts),
-- so its inputs are committed about when they're played. Only adds, so the previous API keeps working during a rollout.

alter table runs
  -- When the token and its seed were dealt. `started_at` moves to the run's real start (`/start`); this never moves.
  add column issued_at timestamptz not null default now(),
  -- The stream so far: the next chunk's seq and first tick, when the last commitment (a chunk or a report) came in,
  -- and the worst lag of one, in seconds (`commitLag`; null before any).
  add column stream_seq integer not null default 0,
  add column stream_ticks integer not null default 0,
  add column stream_at timestamptz,
  add column stream_lag double precision,
  -- The ticks the last report pinned, by the sha256 of their `segmentKey`: a later report (endless mode) must keep them.
  add column stream_base integer not null default 0,
  add column stream_digest text,
  -- Whether the last report was streamed in time (`streamedInTime`), null before one; logged and measured either way.
  add column stream_ok boolean,
  -- Kept off the public boards: only set with STREAM_ENFORCE on, and never cleared. The player's profile and clears still count it.
  add column unlisted boolean not null default false;

-- A run's chunks waiting for its report, which folds them into `runs.stream_digest` and deletes them.
create table run_chunks (
  run_id uuid not null references runs (id) on delete cascade,
  seq integer not null,
  from_tick integer not null,
  to_tick integer not null,
  moves jsonb not null,
  events jsonb not null,
  received_at timestamptz not null default now(),
  primary key (run_id, seq)
);

-- Chunks of runs that never reported (a closed tab) are swept after a day.
create index run_chunks_received on run_chunks (received_at);
