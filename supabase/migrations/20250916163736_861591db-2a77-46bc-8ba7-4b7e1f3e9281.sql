-- Fix relationships for scenario assignments and enable upsert conflict target
-- 1) Unique index to support onConflict(scenario_id, user_id)
CREATE UNIQUE INDEX IF NOT EXISTS scenario_assignments_unique_idx
  ON public.scenario_assignments (scenario_id, user_id);

-- 2) Add FK from scenario_assignments.scenario_id -> training_scenarios.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scenario_assignments_scenario_id_fkey'
  ) THEN
    ALTER TABLE public.scenario_assignments
      ADD CONSTRAINT scenario_assignments_scenario_id_fkey
      FOREIGN KEY (scenario_id)
      REFERENCES public.training_scenarios(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- 3) Add FK from scenario_assignments.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scenario_assignments_user_id_fkey'
  ) THEN
    ALTER TABLE public.scenario_assignments
      ADD CONSTRAINT scenario_assignments_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END$$;
