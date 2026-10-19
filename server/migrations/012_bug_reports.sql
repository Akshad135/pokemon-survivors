-- Bug reports from the game (src/bugReports.ts). Only adds, so the previous API keeps working during a rollout.

-- One row per report, kept even when Discord is down or not set up.
-- `user_id`: the signed-in sender (no foreign key: a guest has none, and a new account may have no row yet).
-- `tech`: the technical info the game sent (`BugTech`), null when the player turned it off.
-- `thread_id`: the #bug-reports forum thread it became, null until (or unless) the bot posted it.
create table bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  text text not null,
  tech jsonb,
  thread_id text,
  created_at timestamptz not null default now()
);
