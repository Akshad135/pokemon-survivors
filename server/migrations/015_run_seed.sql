-- Ranked runs play a seed the server deals. Only adds, so the previous API keeps working during a rollout.

alter table runs
  -- The seed the run must play (its replay's `start.seed`), dealt with the start token: random, or the day's challenge seed.
  -- The game reads seeds as 32-bit unsigned (`createRng`), past `integer`. Null on rows from before the server dealt them, which take any.
  add column seed bigint,
  -- When a newer start token of the same kind (a regular run, or a Desafio do dia run) replaced this one before its run reported.
  -- A replaced token can't report anymore; the row stays so the start rate limit still counts it.
  add column replaced_at timestamptz;
