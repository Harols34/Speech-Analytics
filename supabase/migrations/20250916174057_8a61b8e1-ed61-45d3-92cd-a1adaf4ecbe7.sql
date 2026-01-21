-- Ensure robust completion logic and visibility restrictions for training sessions
-- 1) Trigger to mark scenario assignments as completed when a training session is completed
CREATE OR REPLACE FUNCTION public.mark_assignment_completed()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.scenario_assignments
    SET status = 'completed', completed_at = NOW()
    WHERE scenario_id = NEW.scenario_id
      AND user_id = NEW.user_id
      AND (status IS DISTINCT FROM 'completed');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_training_sessions_complete ON public.training_sessions;
CREATE TRIGGER trg_training_sessions_complete
AFTER INSERT OR UPDATE OF status ON public.training_sessions
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.mark_assignment_completed();

-- 2) RLS policies so agents only see their own sessions; elevated roles can see by account
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- View own sessions
DROP POLICY IF EXISTS "Users can view own training sessions" ON public.training_sessions;
CREATE POLICY "Users can view own training sessions"
ON public.training_sessions
FOR SELECT
USING (user_id = auth.uid());

-- Elevated roles (admins, supervisors, QA, backOffice, superAdmin) can view sessions in assigned accounts
DROP POLICY IF EXISTS "Elevated roles can view sessions by account" ON public.training_sessions;
CREATE POLICY "Elevated roles can view sessions by account"
ON public.training_sessions
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('superAdmin','admin','supervisor','qualityAnalyst','backOffice')
  )) AND (account_id IN (SELECT get_user_accounts()))
);

-- Allow users to update their own sessions (needed for feedback persistence)
DROP POLICY IF EXISTS "Users can update own training sessions" ON public.training_sessions;
CREATE POLICY "Users can update own training sessions"
ON public.training_sessions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Elevated roles can update sessions within accounts they manage
DROP POLICY IF EXISTS "Elevated roles can update sessions by account" ON public.training_sessions;
CREATE POLICY "Elevated roles can update sessions by account"
ON public.training_sessions
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('superAdmin','admin','supervisor','qualityAnalyst','backOffice')
  )) AND (account_id IN (SELECT get_user_accounts()))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('superAdmin','admin','supervisor','qualityAnalyst','backOffice')
  )) AND (account_id IN (SELECT get_user_accounts()))
);
