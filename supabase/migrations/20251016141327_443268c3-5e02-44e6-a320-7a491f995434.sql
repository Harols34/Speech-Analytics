-- Ensure RLS and permissive policies on training_sessions so non-superadmin roles can save and view analysis
DO $$
DECLARE
  _exists boolean;
BEGIN
  -- Enable RLS (ignore if already enabled)
  BEGIN
    ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  -- Insert policy: agents can insert own sessions
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'training_sessions' AND policyname = 'agents_insert_own_training_sessions'
  ) INTO _exists;
  IF NOT _exists THEN
    EXECUTE 'CREATE POLICY agents_insert_own_training_sessions ON public.training_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;

  -- Update policy: agents can update own sessions
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'training_sessions' AND policyname = 'agents_update_own_training_sessions'
  ) INTO _exists;
  IF NOT _exists THEN
    EXECUTE 'CREATE POLICY agents_update_own_training_sessions ON public.training_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;

  -- Update policy: elevated roles can update sessions in assigned accounts
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'training_sessions' AND policyname = 'elevated_update_assigned_training_sessions'
  ) INTO _exists;
  IF NOT _exists THEN
    EXECUTE 'CREATE POLICY elevated_update_assigned_training_sessions ON public.training_sessions FOR UPDATE TO authenticated USING (public.has_elevated_role(auth.uid()) AND (account_id IN (SELECT public.get_user_accounts()) OR public.is_super_admin())) WITH CHECK (public.has_elevated_role(auth.uid()) AND (account_id IN (SELECT public.get_user_accounts()) OR public.is_super_admin()))';
  END IF;

  -- Select policy: own, assigned account, or elevated roles
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'training_sessions' AND policyname = 'select_own_or_assigned_or_elevated_training_sessions'
  ) INTO _exists;
  IF NOT _exists THEN
    EXECUTE 'CREATE POLICY select_own_or_assigned_or_elevated_training_sessions ON public.training_sessions FOR SELECT TO authenticated USING (user_id = auth.uid() OR account_id IN (SELECT public.get_user_accounts()) OR public.has_elevated_role(auth.uid()) OR public.is_super_admin())';
  END IF;

END $$;