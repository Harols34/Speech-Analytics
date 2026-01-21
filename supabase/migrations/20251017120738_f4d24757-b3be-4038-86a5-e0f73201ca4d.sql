-- Agregar columna scenario_name para preservar el nombre del escenario aunque se elimine
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS scenario_name TEXT;

-- Actualizar registros existentes con el nombre del escenario desde la relación
UPDATE public.training_sessions ts
SET scenario_name = sc.name
FROM public.training_scenarios sc
WHERE ts.scenario_id = sc.id
  AND ts.scenario_name IS NULL;

-- Comentario explicativo
COMMENT ON COLUMN public.training_sessions.scenario_name IS 
'Nombre del escenario de entrenamiento al momento de crear la sesión. Se preserva aunque se elimine el escenario para mantener trazabilidad.';

-- Actualizar la función save_training_session_secure para incluir scenario_name
CREATE OR REPLACE FUNCTION public.save_training_session_secure(
  p_id uuid,
  p_scenario_id uuid,
  p_user_id uuid,
  p_user_name text,
  p_account_id uuid,
  p_type text,
  p_status text,
  p_started_at timestamp with time zone,
  p_completed_at timestamp with time zone,
  p_duration_seconds integer,
  p_conversation jsonb,
  p_performance_score integer,
  p_ai_summary text,
  p_mensajes_generales integer,
  p_mensajes_ia integer,
  p_mensajes_usuario integer,
  p_scenario_name text DEFAULT NULL,
  p_scenario_category text DEFAULT NULL,
  p_scenario_difficulty text DEFAULT NULL,
  p_scenario_description text DEFAULT NULL,
  p_client_personality jsonb DEFAULT '{}'::jsonb,
  p_objectives text[] DEFAULT ARRAY[]::text[],
  p_context text DEFAULT NULL
)
RETURNS training_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.training_sessions;
BEGIN
  -- Security: the authenticated user must be the session owner
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Usuario no autorizado para crear/actualizar esta sesión';
  END IF;

  -- Ensure the referenced scenario exists to satisfy FK constraint
  IF NOT EXISTS (SELECT 1 FROM public.training_scenarios WHERE id = p_scenario_id) THEN
    INSERT INTO public.training_scenarios (
      id,
      name,
      description,
      category,
      difficulty,
      duration_minutes,
      client_personality,
      objectives,
      context,
      created_at,
      updated_at,
      is_active,
      account_id,
      created_by
    ) VALUES (
      COALESCE(p_scenario_id, gen_random_uuid()),
      COALESCE(p_scenario_name, 'Escenario'),
      p_scenario_description,
      COALESCE(p_scenario_category, 'general'),
      COALESCE(p_scenario_difficulty, 'beginner'),
      15,
      COALESCE(p_client_personality, '{}'::jsonb),
      COALESCE(p_objectives, ARRAY[]::text[]),
      p_context,
      NOW(), NOW(), true,
      p_account_id,
      p_user_id
    );
  END IF;

  -- Upsert into training_sessions
  INSERT INTO public.training_sessions AS ts (
    id, scenario_id, scenario_name, user_id, user_name, account_id, type, status,
    started_at, completed_at, duration_seconds, conversation,
    performance_score, ai_summary,
    mensajes_generales, mensajes_ia, mensajes_usuario
  ) VALUES (
    COALESCE(p_id, gen_random_uuid()), 
    p_scenario_id, 
    COALESCE(p_scenario_name, 'Escenario'), 
    p_user_id, 
    p_user_name, 
    p_account_id, 
    p_type, 
    p_status,
    COALESCE(p_started_at, NOW()), 
    p_completed_at, 
    p_duration_seconds, 
    COALESCE(p_conversation, '[]'::jsonb),
    p_performance_score, 
    p_ai_summary,
    COALESCE(p_mensajes_generales, 0), 
    COALESCE(p_mensajes_ia, 0), 
    COALESCE(p_mensajes_usuario, 0)
  )
  ON CONFLICT (id)
  DO UPDATE SET
    scenario_id = EXCLUDED.scenario_id,
    scenario_name = COALESCE(EXCLUDED.scenario_name, ts.scenario_name),
    user_id = EXCLUDED.user_id,
    user_name = EXCLUDED.user_name,
    account_id = EXCLUDED.account_id,
    type = EXCLUDED.type,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    duration_seconds = EXCLUDED.duration_seconds,
    conversation = EXCLUDED.conversation,
    performance_score = EXCLUDED.performance_score,
    ai_summary = EXCLUDED.ai_summary,
    mensajes_generales = EXCLUDED.mensajes_generales,
    mensajes_ia = EXCLUDED.mensajes_ia,
    mensajes_usuario = EXCLUDED.mensajes_usuario,
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;