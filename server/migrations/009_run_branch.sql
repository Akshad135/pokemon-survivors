-- Branching evolutions: the form a run ended in when its family branches
-- (Espeon, Gallade…). Only adds, so the previous API keeps working.
alter table runs
  -- `BranchId` (src/data/branches.ts) the run took; null when it took none, and for every run before this.
  -- Re-simulation replaces the reported one with the replay's own.
  add column branch text;
