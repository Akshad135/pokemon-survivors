-- What the Discord bot already did (src/discord.ts). Only adds, so the previous API keeps working during a rollout.

-- One row per post or welcome, by key (`patch:<date>`, `challenge:<day>`, `podium:<day>`, `outbreak:<day>`,
-- `welcome:<user>`, `short:<message>`). Claiming the key before posting keeps two instances from posting twice.
-- `message_id`: the Discord message it became, so a patch note can be edited when its update grows.
create table discord_posts (
  key text primary key,
  message_id text,
  posted_at timestamptz not null default now()
);
