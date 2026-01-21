-- Ensure helper function for elevated roles
CREATE OR REPLACE FUNCTION public.has_elevated_role(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.role IN ('superAdmin','admin','supervisor','qualityAnalyst','backOffice')
  );
$$;

-- Tighten RLS on training_sessions so agents only see their own
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename='training_sessions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Agents can only view their own sessions
CREATE POLICY "agents_select_own_training_sessions" ON public.training_sessions
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent'
  AND user_id = auth.uid()
);

-- Elevated roles can view sessions from assigned accounts (or all if superAdmin)
CREATE POLICY "elevated_select_assigned_training_sessions" ON public.training_sessions
FOR SELECT
USING (
  public.has_elevated_role(auth.uid()) AND (
    account_id IN (SELECT get_user_accounts()) OR public.is_super_admin()
  )
);

-- Users can insert their own sessions
CREATE POLICY "users_insert_own_training_sessions" ON public.training_sessions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Agents can update only their own sessions
CREATE POLICY "agents_update_own_training_sessions" ON public.training_sessions
FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent' AND user_id = auth.uid()
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent' AND user_id = auth.uid()
);

-- Elevated roles can update sessions from assigned accounts
CREATE POLICY "elevated_update_assigned_training_sessions" ON public.training_sessions
FOR UPDATE
USING (
  public.has_elevated_role(auth.uid()) AND (
    account_id IN (SELECT get_user_accounts()) OR public.is_super_admin()
  )
)
WITH CHECK (
  public.has_elevated_role(auth.uid()) AND (
    account_id IN (SELECT get_user_accounts()) OR public.is_super_admin()
  )
);

-- Only superAdmin can delete sessions
CREATE POLICY "superadmin_delete_training_sessions" ON public.training_sessions
FOR DELETE
USING (public.is_super_admin());

-- Optional: ensure assignments are marked completed when a session is completed
DROP TRIGGER IF EXISTS trg_mark_assignment_completed ON public.training_sessions;
CREATE TRIGGER trg_mark_assignment_completed
AFTER UPDATE ON public.training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.mark_assignment_completed();

-- Tighten RLS on training_messages so agents only see messages from their own sessions
DO $$
DECLARE pol2 RECORD;
BEGIN
  FOR pol2 IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename='training_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol2.policyname, pol2.schemaname, pol2.tablename);
  END LOOP;
END $$;

ALTER TABLE public.training_messages ENABLE ROW LEVEL SECURITY;

-- Select: agents only own session messages
CREATE POLICY "agents_select_own_training_messages" ON public.training_messages
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent' AND 
  session_id IN (
    SELECT ts.id FROM public.training_sessions ts WHERE ts.user_id = auth.uid()
  )
);

-- Select: elevated roles can view messages for assigned accounts
CREATE POLICY "elevated_select_assigned_training_messages" ON public.training_messages
FOR SELECT
USING (
  public.has_elevated_role(auth.uid()) AND (
    session_id IN (
      SELECT ts.id FROM public.training_sessions ts 
      WHERE ts.account_id IN (SELECT get_user_accounts()) OR public.is_super_admin()
    )
  )
);

-- Insert: agents can insert only to their own sessions
CREATE POLICY "agents_insert_own_training_messages" ON public.training_messages
FOR INSERT
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent' AND 
  session_id IN (
    SELECT ts.id FROM public.training_sessions ts WHERE ts.user_id = auth.uid()
  )
);

-- Insert: elevated roles can insert to assigned accounts' sessions
CREATE POLICY "elevated_insert_assigned_training_messages" ON public.training_messages
FOR INSERT
WITH CHECK (
  public.has_elevated_role(auth.uid()) AND 
  session_id IN (
    SELECT ts.id FROM public.training_sessions ts 
    WHERE ts.account_id IN (SELECT get_user_accounts()) OR public.is_super_admin()
  )
);

-- Update: keep existing intent (own or superAdmin)
CREATE POLICY "agents_update_own_training_messages" ON public.training_messages
FOR UPDATE
USING (
  session_id IN (SELECT ts.id FROM public.training_sessions ts WHERE ts.user_id = auth.uid())
)
WITH CHECK (
  session_id IN (SELECT ts.id FROM public.training_sessions ts WHERE ts.user_id = auth.uid())
);

-- Delete remains superAdmin only
CREATE POLICY "superadmin_delete_training_messages" ON public.training_messages
FOR DELETE
USING (public.is_super_admin());