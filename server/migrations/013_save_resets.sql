-- Wiping an edited save (server/README.md, "Resetting a save"). Only adds, so the previous API keeps working during a rollout.

-- The revision the reset stored: a push from a device that hasn't seen it gets the reset save back (`applyPush`).
alter table users add column save_reset_revision integer;

-- What each reset wiped, to show the player (or undo it).
create table save_resets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users (id) on delete cascade,
  data jsonb not null,
  revision integer not null,
  reason text not null,
  reset_at timestamptz not null default now()
);
