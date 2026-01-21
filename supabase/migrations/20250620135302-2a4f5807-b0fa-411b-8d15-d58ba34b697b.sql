
-- Actualizar la función para usar datos reales de las tablas
CREATE OR REPLACE FUNCTION public.check_account_limits_v2(p_account_id uuid, p_tipo text, p_subtipo text DEFAULT NULL)
RETURNS TABLE(limite_alcanzado boolean, uso_actual numeric, limite_total integer, porcentaje_uso numeric, horas_adicionales integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limite INTEGER;
  v_horas_adicionales INTEGER := 0;
  v_uso_actual NUMERIC;
  v_fecha_inicio DATE;
BEGIN
  -- Obtener el primer día del mes actual
  v_fecha_inicio := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Obtener límites y horas adicionales
  IF p_tipo = 'transcripcion' THEN
    SELECT limite_horas, COALESCE(horas_adicionales, 0) INTO v_limite, v_horas_adicionales
    FROM public.account_limits
    WHERE account_id = p_account_id;
  ELSE
    SELECT limite_consultas INTO v_limite
    FROM public.account_limits
    WHERE account_id = p_account_id;
  END IF;
  
  -- Valores por defecto si no hay configuración
  IF v_limite IS NULL THEN
    v_limite := CASE WHEN p_tipo = 'transcripcion' THEN 10 ELSE 50 END;
  END IF;
  
  -- Calcular uso actual del mes DIRECTAMENTE de las tablas principales
  IF p_tipo = 'transcripcion' THEN
    -- Para transcripción, usar la tabla calls directamente
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
  
  -- Para transcripción, incluir horas adicionales en el límite total
  IF p_tipo = 'transcripcion' THEN
    v_limite := v_limite + v_horas_adicionales;
  END IF;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    v_uso_actual >= v_limite AS limite_alcanzado,
    v_uso_actual,
    v_limite,
    CASE 
      WHEN v_limite > 0 THEN ROUND((v_uso_actual / v_limite * 100), 2)
      ELSE 0
    END AS porcentaje_uso,
    v_horas_adicionales;
END;
$$;

-- Actualizar los triggers para usar datos reales
CREATE OR REPLACE FUNCTION public.check_transcription_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_uso_actual NUMERIC;
  v_limite INTEGER;
  v_horas_adicionales INTEGER := 0;
  v_fecha_inicio DATE;
BEGIN
  -- Obtener el primer día del mes actual
  v_fecha_inicio := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Obtener límites
  SELECT limite_horas, COALESCE(horas_adicionales, 0) INTO v_limite, v_horas_adicionales
  FROM public.account_limits
  WHERE account_id = NEW.account_id;
  
  -- Valor por defecto si no hay configuración
  IF v_limite IS NULL THEN
    v_limite := 10;
  END IF;
  
  -- Incluir horas adicionales
  v_limite := v_limite + v_horas_adicionales;
  
  -- Calcular uso actual en horas (incluyendo la nueva llamada si tiene duración)
  SELECT COALESCE(SUM(duration) / 3600.0, 0) + COALESCE(NEW.duration / 3600.0, 0) INTO v_uso_actual
  FROM public.calls
  WHERE account_id = NEW.account_id
  AND date::date >= v_fecha_inicio;
  
  -- Si se alcanzó el límite, bloquear la inserción
  IF v_uso_actual > v_limite THEN
    RAISE EXCEPTION 'Límite de transcripción alcanzado para esta cuenta. Contacta al administrador.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar trigger para chat general
CREATE OR REPLACE FUNCTION public.check_chat_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_uso_actual NUMERIC;
  v_limite INTEGER;
  v_fecha_inicio DATE;
BEGIN
  -- Obtener el primer día del mes actual
  v_fecha_inicio := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Obtener límite
  SELECT limite_consultas INTO v_limite
  FROM public.account_limits
  WHERE account_id = NEW.account_id;
  
  -- Valor por defecto si no hay configuración
  IF v_limite IS NULL THEN
    v_limite := 50;
  END IF;
  
  -- Calcular uso actual (incluyendo el nuevo mensaje)
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_uso_actual
  FROM public.chat_messages
  WHERE account_id = NEW.account_id
  AND timestamp::date >= v_fecha_inicio;
  
  -- Si se alcanzó el límite, bloquear la inserción
  IF v_uso_actual > v_limite THEN
    RAISE EXCEPTION 'Límite de consultas de chat alcanzado para esta cuenta. Contacta al administrador.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar trigger para chat por llamada
CREATE OR REPLACE FUNCTION public.check_call_chat_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_uso_actual NUMERIC;
  v_limite INTEGER;
  v_fecha_inicio DATE;
  v_account_id UUID;
BEGIN
  -- Obtener el primer día del mes actual
  v_fecha_inicio := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Obtener el account_id de la llamada
  SELECT account_id INTO v_account_id 
  FROM public.calls 
  WHERE id = NEW.call_id;
  
  -- Obtener límite
  SELECT limite_consultas INTO v_limite
  FROM public.account_limits
  WHERE account_id = v_account_id;
  
  -- Valor por defecto si no hay configuración
  IF v_limite IS NULL THEN
    v_limite := 50;
  END IF;
  
  -- Calcular uso actual total de chat (general + llamada) incluyendo el nuevo mensaje
  SELECT COALESCE(
    (SELECT COUNT(*) FROM public.chat_messages WHERE account_id = v_account_id AND timestamp::date >= v_fecha_inicio) +
    (SELECT COUNT(*) FROM public.call_chat_messages ccm INNER JOIN public.calls c ON ccm.call_id = c.id WHERE c.account_id = v_account_id AND ccm.timestamp::date >= v_fecha_inicio),
    0
  ) + 1 INTO v_uso_actual;
  
  -- Si se alcanzó el límite, bloquear la inserción
  IF v_uso_actual > v_limite THEN
    RAISE EXCEPTION 'Límite de consultas por llamada alcanzado para esta cuenta. Contacta al administrador.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear los triggers
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
