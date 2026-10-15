-- Mystery Gifts and invites. Only adds, so the previous API keeps working during a rollout.

-- Presente Misterioso: each player's inbox. The game fetches the unclaimed ones
-- when it syncs, applies them to the save (`applyGift` in src/game/gifts.ts) and claims them.
create table gifts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users (id) on delete cascade,
  -- `GiftContent['kind']`, also inside `payload`; a column to look them up by.
  kind text not null,
  -- `GiftContent` (src/game/gifts.ts).
  payload jsonb not null,
  -- `GiftReason`: why it came (an invite's welcome, friends brought), null for none.
  reason jsonb,
  -- Keeps one gift per occasion (`welcome`, `friends:3:0`, a day's ribbon): sending it again does nothing.
  key text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create unique index gifts_key on gifts (user_id, key);
-- The inbox: a player's unclaimed gifts, oldest first.
create index gifts_unclaimed on gifts (user_id, created_at) where claimed_at is null;

-- Invites: who brought this player (set once, only for a new account) and
-- when the invite counted for them (after the newcomer's first verified runs).
alter table users
  add column referred_by text references users (id) on delete set null,
  add column referred_at timestamptz,
  add column referral_credited_at timestamptz;

-- Friends a player brought, for the milestones and the public profile.
create index users_referred_by on users (referred_by) where referral_credited_at is not null;
