-- The admin's gift desk (src/admin.ts). Only adds, so the previous API keeps working during a rollout.

-- Who sent a gift by hand, null for the ones the API sends on its own (invites, ribbons, donations).
alter table gifts add column sent_by text references users (id) on delete set null;

-- The desk's recent list: gifts sent by hand, newest first.
create index gifts_sent on gifts (created_at desc) where sent_by is not null;
