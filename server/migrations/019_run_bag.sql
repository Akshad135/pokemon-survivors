-- The Bag items a run took (`ReplayStart.bag`: Lure, Rare Candy, Max Revive…), written from its replay
-- when it reports, so the boards and profiles can show them after the replay itself is dropped (a checked
-- run keeps none). Runs from before this have none. Only adds, so the previous API keeps working during a rollout.
alter table runs add column bag text[] not null default '{}';
