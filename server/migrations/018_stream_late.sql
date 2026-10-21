-- How many of a run's commitments (chunks, and a victory's report) came more than `STREAM.lagTolerance` late.
-- An honest player pauses a few times a run (switching tabs pauses the game), a bot searching offline would lag on
-- almost every chunk: measured here, while only observing, to pick how many late ones enforcement forgives.
-- Counts from this deploy on. Only adds, so the previous API keeps working during a rollout.

alter table runs add column stream_late integer not null default 0;
