-- One row per player, keyed by the Clerk user id. The ranking adds its profile columns here.
create table users (
  id text primary key,
  created_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);

-- The game's meta save (`Save` in src/game/meta.ts), one per player.
create table saves (
  user_id text primary key references users (id) on delete cascade,
  -- The save's schema version (`SAVE_VERSION`).
  version integer not null,
  -- Goes up by one with every push; devices push on top of it (src/game/sync.ts).
  revision integer not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
