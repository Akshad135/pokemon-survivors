-- The Discord account a player linked in the game (src/discordLink.ts). Only adds, so the previous API keeps working during a rollout.

-- `discord_id`: the Discord user id, for the bot to keep their supporter role (one game account per Discord account).
-- `discord_name`: their Discord username when they linked, to show.
alter table users
  add column discord_id text,
  add column discord_name text;

create unique index users_discord on users (discord_id);
