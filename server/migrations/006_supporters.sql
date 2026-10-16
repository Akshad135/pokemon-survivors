-- Supporters: donations, the tier they add up to, and the supporters' poll. Only adds, so the previous API keeps working during a rollout.

-- One row per donation. AbacatePay's is created when its checkout opens (`ref` is our id, sent as the checkout's
-- externalId) and its webhook marks it paid; Stripe's comes in paid with its webhook (`ref` is the Checkout Session id).
create table donations (
  id uuid primary key default gen_random_uuid(),
  -- `abacatepay` or `stripe`.
  provider text not null,
  ref text not null unique,
  -- The handle the donor gave, if any, and the account it's for: that handle's, or whoever redeems the code.
  handle text,
  user_id text references users (id) on delete set null,
  -- What was paid, in cents of `currency`, and the points it adds (`donationPoints` in src/game/supporters.ts).
  amount integer,
  currency text,
  points integer not null default 0,
  -- A paid donation with no account gets a code (`PS-XXXX-XXXX`), shown on the thank-you page and redeemed in the game.
  code text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  -- When its points went to `user_id`. Once.
  credited_at timestamptz
);

-- A supporter's total and since when. `supporter_public`: the badge, the wall and the victory's credits show them (the player's choice).
alter table users
  add column supporter_points integer not null default 0,
  add column supporter_since timestamptz,
  add column supporter_public boolean not null default true;

-- The wall: supporters, oldest first.
create index users_supporters on users (supporter_since) where supporter_points > 0;

-- The supporters' poll (`POLL` in src/data/supporters.ts): one vote per player per poll, which they may change.
create table poll_votes (
  poll text not null,
  user_id text not null references users (id) on delete cascade,
  choice text not null,
  voted_at timestamptz not null default now(),
  primary key (poll, user_id)
);
