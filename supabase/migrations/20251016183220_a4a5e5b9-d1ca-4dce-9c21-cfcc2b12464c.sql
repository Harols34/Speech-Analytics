-- Ensure RLS and permissions for training_sessions and provide secure RPC for recording updates

-- 1) Enable RLS on training_sessions (safe if already enabled)
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables 
   WHERE table_schema='public' AND table_name='training_sessions';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 2) Policies: allow agents to select their own sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='training_sessions' AND policyname='agents_select_own_training_sessions'
  ) THEN
    CREATE POLICY "agents_select_own_training_sessions"
    ON public.training_sessions
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;

-- 3) Policies: allow elevated roles to select sessions from assigned accounts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='training_sessions' AND policyname='elevated_select_assigned_training_sessions'
  ) THEN
    CREATE POLICY "elevated_select_assigned_training_sessions"
    ON public.training_sessions
    FOR SELECT
    USING (
      public.has_elevated_role(auth.uid())
      AND (
        account_id IN (SELECT public.get_user_accounts())
        OR public.is_super_admin()
      )
    );
  END IF;
END $$;

-- 4) Optional write policies for own sessions (keeps client operations working if used)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='training_sessions' AND policyname='agents_insert_own_training_sessions'
  ) THEN
    CREATE POLICY "agents_insert_own_training_sessions"
    ON public.training_sessions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='training_sessions' AND policyname='agents_update_own_training_sessions'
  ) THEN
    CREATE POLICY "agents_update_own_training_sessions"
    ON public.training_sessions
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 5) Secure RPC to update recording_url
CREATE OR REPLACE FUNCTION public.update_training_session_recording(
  p_session_id uuid,
  p_recording_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow: session owner, elevated roles, or super admin
  IF NOT (
    EXISTS (SELECT 1 FROM public.training_sessions ts WHERE ts.id = p_session_id AND ts.user_id = auth.uid())
    OR public.has_elevated_role(auth.uid())
    OR public.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'No autorizado para actualizar la grabación de esta sesión';
  END IF;

  UPDATE public.training_sessions
  SET recording_url = p_recording_url,
      updated_at = now()
  WHERE id = p_session_id;
END;
$$;

-- 6) Grants: allow authenticated to execute secure RPCs
DO $$ BEGIN
  -- save_training_session_secure (basic signature)
  PERFORM 1 FROM pg_proc WHERE proname = 'save_training_session_secure';
  IF FOUND THEN
    BEGIN
      GRANT EXECUTE ON FUNCTION public.save_training_session_secure(
        uuid, uuid, uuid, text, uuid, text, text, timestamptz, timestamptz, integer, jsonb, integer, text, integer, integer, integer
      ) TO authenticated;
    EXCEPTION WHEN undefined_function THEN NULL; END;
  END IF;
END $$;

DO $$ BEGIN
  -- save_training_session_secure (extended signature with scenario metadata)
  BEGIN
    GRANT EXECUTE ON FUNCTION public.save_training_session_secure(
      uuid, uuid, uuid, text, uuid, text, text, timestamptz, timestamptz, integer, jsonb, integer, text, integer, integer, integer,
      text, text, text, text, jsonb, text[], text
    ) TO authenticated;
  EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

DO $$ BEGIN
  -- save_training_analysis_secure
  BEGIN
    GRANT EXECUTE ON FUNCTION public.save_training_analysis_secure(
      uuid, integer, text, text[], text[], jsonb
    ) TO authenticated;
  EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- update_training_session_recording
GRANT EXECUTE ON FUNCTION public.update_training_session_recording(uuid, text) TO authenticated;
