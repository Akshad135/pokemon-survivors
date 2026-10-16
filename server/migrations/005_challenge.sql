-- Desafio do dia: challenge runs and their official attempts. Only adds, so the previous API keeps working during a rollout.

alter table runs
  -- The Brasília day of the challenge this run plays (`dailyChallenge` in src/game/challenge.ts), null for any other run.
  -- Set when the run starts; its replay must be that day's challenge when it ends.
  add column challenge date,
  -- The player's official attempt of that day: their first challenge run to finish. Null for any other run.
  add column official boolean;

-- A day's challenge board, and whether a player already made their attempt.
create index runs_challenge on runs (challenge, survived desc) where official;
create index runs_challenge_user on runs (user_id, challenge) where official;
