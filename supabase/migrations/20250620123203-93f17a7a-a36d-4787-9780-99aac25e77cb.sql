
-- Función para verificar límites antes de insertar en calls
CREATE OR REPLACE FUNCTION public.check_transcription_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_limit_result RECORD;
BEGIN
  -- Verificar límites usando la función existente
  SELECT * INTO v_limit_result 
  FROM public.check_account_limits_v2(NEW.account_id, 'transcripcion', NULL);
  
  -- Si se alcanzó el límite, bloquear la inserción
  IF v_limit_result.limite_alcanzado THEN
    RAISE EXCEPTION 'Límite de transcripción alcanzado para esta cuenta. Contacta al administrador.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar límites antes de insertar en chat_messages
CREATE OR REPLACE FUNCTION public.check_chat_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_limit_result RECORD;
BEGIN
  -- Verificar límites para chat general
  SELECT * INTO v_limit_result 
  FROM public.check_account_limits_v2(NEW.account_id, 'chat', 'chat_general');
  
  -- Si se alcanzó el límite, bloquear la inserción
  IF v_limit_result.limite_alcanzado THEN
    RAISE EXCEPTION 'Límite de consultas de chat alcanzado para esta cuenta. Contacta al administrador.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar límites antes de insertar en call_chat_messages
CREATE OR REPLACE FUNCTION public.check_call_chat_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_limit_result RECORD;
  v_account_id UUID;
BEGIN
  -- Obtener el account_id de la llamada
  SELECT account_id INTO v_account_id 
  FROM public.calls 
  WHERE id = NEW.call_id;
  
  -- Verificar límites para chat por llamada
  SELECT * INTO v_limit_result 
  FROM public.check_account_limits_v2(v_account_id, 'chat', 'chat_llamada');
  
  -- Si se alcanzó el límite, bloquear la inserción
  IF v_limit_result.limite_alcanzado THEN
    RAISE EXCEPTION 'Límite de consultas por llamada alcanzado para esta cuenta. Contacta al administrador.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear los triggers
DROP TRIGGER IF EXISTS check_transcription_limit_trigger ON public.calls;
CREATE TRIGGER check_transcription_limit_trigger
  BEFORE INSERT ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.check_transcription_limit_before_insert();

DROP TRIGGER IF EXISTS check_chat_limit_trigger ON public.chat_messages;
CREATE TRIGGER check_chat_limit_trigger
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_chat_limit_before_insert();

DROP TRIGGER IF EXISTS check_call_chat_limit_trigger ON public.call_chat_messages;
CREATE TRIGGER check_call_chat_limit_trigger
  BEFORE INSERT ON public.call_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_call_chat_limit_before_insert();

-- Función mejorada para obtener uso actual en tiempo real
CREATE OR REPLACE FUNCTION public.get_real_time_usage(p_account_id uuid, p_tipo text, p_subtipo text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uso_actual NUMERIC := 0;
  v_fecha_inicio DATE;
BEGIN
  -- Obtener el primer día del mes actual
  v_fecha_inicio := date_trunc('month', CURRENT_DATE)::DATE;
  
  IF p_tipo = 'transcripcion' THEN
    -- Para transcripción, calcular horas del mes actual
    SELECT COALESCE(SUM(duration) / 3600.0, 0) INTO v_uso_actual
    FROM public.calls
    WHERE account_id = p_account_id
    AND date::date >= v_fecha_inicio;
    
  ELSIF p_tipo = 'chat' THEN
    IF p_subtipo = 'chat_general' THEN
      -- Contar mensajes de chat general del mes actual
      SELECT COALESCE(COUNT(*), 0) INTO v_uso_actual
      FROM public.chat_messages
      WHERE account_id = p_account_id
      AND timestamp::date >= v_fecha_inicio;
      
    ELSIF p_subtipo = 'chat_llamada' THEN
      -- Contar mensajes de chat por llamada del mes actual
      SELECT COALESCE(COUNT(*), 0) INTO v_uso_actual
      FROM public.call_chat_messages ccm
      INNER JOIN public.calls c ON ccm.call_id = c.id
      WHERE c.account_id = p_account_id
      AND ccm.timestamp::date >= v_fecha_inicio;
      
    ELSE
      -- Contar todos los mensajes de chat del mes actual
      SELECT COALESCE(
        (SELECT COUNT(*) FROM public.chat_messages WHERE account_id = p_account_id AND timestamp::date >= v_fecha_inicio) +
        (SELECT COUNT(*) FROM public.call_chat_messages ccm INNER JOIN public.calls c ON ccm.call_id = c.id WHERE c.account_id = p_account_id AND ccm.timestamp::date >= v_fecha_inicio),
        0
      ) INTO v_uso_actual;
    END IF;
  END IF;
  
  RETURN v_uso_actual;
END;
$$;
