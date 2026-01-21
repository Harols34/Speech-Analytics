-- Fix update_training_session_recording to handle sessions properly
CREATE OR REPLACE FUNCTION public.update_training_session_recording(
  p_session_id uuid,
  p_recording_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_user_id uuid;
BEGIN
  -- Get the session's user_id
  SELECT user_id INTO v_session_user_id
  FROM public.training_sessions
  WHERE id = p_session_id;
  
  -- If session doesn't exist yet, we cannot update it
  IF v_session_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesión de entrenamiento no encontrada';
  END IF;
  
  -- Allow: session owner, elevated roles, or super admin
  IF NOT (
    v_session_user_id = auth.uid()
    OR public.has_elevated_role(auth.uid())
    OR public.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'No autorizado para actualizar la grabación de esta sesión';
  END IF;

  -- Update the recording URL
  UPDATE public.training_sessions
  SET recording_url = p_recording_url,
      updated_at = now()
  WHERE id = p_session_id;
  
  -- Log success
  RAISE NOTICE 'Grabación actualizada para sesión %', p_session_id;
END;
$$;