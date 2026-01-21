
-- Primero, corregir el error de ambigüedad en la función principal
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
  
  -- Obtener límites y horas adicionales específicos para esta cuenta
  IF p_tipo = 'transcripcion' THEN
    SELECT al.limite_horas, COALESCE(al.horas_adicionales, 0) 
    INTO v_limite, v_horas_adicionales
    FROM public.account_limits al
    WHERE al.account_id = p_account_id;
  ELSE
    SELECT al.limite_consultas 
    INTO v_limite
    FROM public.account_limits al
    WHERE al.account_id = p_account_id;
  END IF;
  
  -- Valores por defecto si no hay configuración para esta cuenta específica
  IF v_limite IS NULL THEN
    v_limite := CASE WHEN p_tipo = 'transcripcion' THEN 10 ELSE 50 END;
  END IF;
  
  -- Calcular uso actual del mes DIRECTAMENTE de las tablas principales para esta cuenta específica
  IF p_tipo = 'transcripcion' THEN
    -- Para transcripción, usar la tabla calls directamente para esta cuenta
    SELECT COALESCE(SUM(c.duration) / 3600.0, 0) INTO v_uso_actual
    FROM public.calls c
    WHERE c.account_id = p_account_id
    AND c.date::date >= v_fecha_inicio;
    
  ELSIF p_tipo = 'chat' THEN
    IF p_subtipo = 'chat_general' THEN
      -- Contar mensajes de chat general del mes actual para esta cuenta
      SELECT COALESCE(COUNT(*), 0) INTO v_uso_actual
      FROM public.chat_messages cm
      WHERE cm.account_id = p_account_id
      AND cm.timestamp::date >= v_fecha_inicio;
      
    ELSIF p_subtipo = 'chat_llamada' THEN
      -- Contar mensajes de chat por llamada del mes actual para esta cuenta
      SELECT COALESCE(COUNT(*), 0) INTO v_uso_actual
      FROM public.call_chat_messages ccm
      INNER JOIN public.calls c ON ccm.call_id = c.id
      WHERE c.account_id = p_account_id
      AND ccm.timestamp::date >= v_fecha_inicio;
      
    ELSE
      -- Contar todos los mensajes de chat del mes actual para esta cuenta
      SELECT COALESCE(
        (SELECT COUNT(*) FROM public.chat_messages cm WHERE cm.account_id = p_account_id AND cm.timestamp::date >= v_fecha_inicio) +
        (SELECT COUNT(*) FROM public.call_chat_messages ccm INNER JOIN public.calls c ON ccm.call_id = c.id WHERE c.account_id = p_account_id AND ccm.timestamp::date >= v_fecha_inicio),
        0
      ) INTO v_uso_actual;
    END IF;
  END IF;
  
  -- Para transcripción, incluir horas adicionales en el límite total para esta cuenta
  IF p_tipo = 'transcripcion' THEN
    v_limite := v_limite + v_horas_adicionales;
  END IF;
  
  -- Retornar resultado específico para esta cuenta
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

-- Función específica para verificar límites de transcripción por cuenta
CREATE OR REPLACE FUNCTION public.can_transcribe_for_account(p_account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limit_result RECORD;
BEGIN
  -- Verificar límites específicos de transcripción para esta cuenta
  SELECT * INTO v_limit_result 
  FROM public.check_account_limits_v2(p_account_id, 'transcripcion', NULL);
  
  -- Retornar si puede transcribir (false si límite alcanzado)
  RETURN NOT v_limit_result.limite_alcanzado;
END;
$$;

-- Función específica para verificar límites de consultas por cuenta
CREATE OR REPLACE FUNCTION public.can_chat_for_account(p_account_id uuid, p_subtipo text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limit_result RECORD;
BEGIN
  -- Verificar límites específicos de consultas para esta cuenta
  SELECT * INTO v_limit_result 
  FROM public.check_account_limits_v2(p_account_id, 'chat', p_subtipo);
  
  -- Retornar si puede hacer consultas (false si límite alcanzado)
  RETURN NOT v_limit_result.limite_alcanzado;
END;
$$;

-- Actualizar trigger para transcripción con validación por cuenta específica
CREATE OR REPLACE FUNCTION public.check_transcription_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_can_transcribe BOOLEAN;
BEGIN
  -- Verificar si esta cuenta específica puede transcribir
  SELECT public.can_transcribe_for_account(NEW.account_id) INTO v_can_transcribe;
  
  -- Si no puede transcribir, bloquear la inserción con mensaje específico
  IF NOT v_can_transcribe THEN
    RAISE EXCEPTION 'Límite de transcripción alcanzado para la cuenta %. Has alcanzado el límite mensual para cargar grabaciones de llamadas. Intenta nuevamente el próximo mes.', NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar trigger para chat general con validación por cuenta específica
CREATE OR REPLACE FUNCTION public.check_chat_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_can_chat BOOLEAN;
BEGIN
  -- Verificar si esta cuenta específica puede hacer consultas de chat general
  SELECT public.can_chat_for_account(NEW.account_id, 'chat_general') INTO v_can_chat;
  
  -- Si no puede hacer consultas, bloquear la inserción con mensaje específico
  IF NOT v_can_chat THEN
    RAISE EXCEPTION 'Límite de consultas alcanzado para la cuenta %. Has alcanzado el límite mensual para interacciones con el chatbot. Intenta nuevamente el próximo mes.', NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar trigger para chat por llamada con validación por cuenta específica
CREATE OR REPLACE FUNCTION public.check_call_chat_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
  v_can_chat BOOLEAN;
BEGIN
  -- Obtener el account_id de la llamada
  SELECT account_id INTO v_account_id 
  FROM public.calls 
  WHERE id = NEW.call_id;
  
  -- Verificar si esta cuenta específica puede hacer consultas de chat por llamada
  SELECT public.can_chat_for_account(v_account_id, 'chat_llamada') INTO v_can_chat;
  
  -- Si no puede hacer consultas, bloquear la inserción con mensaje específico
  IF NOT v_can_chat THEN
    RAISE EXCEPTION 'Límite de consultas por llamada alcanzado para la cuenta %. Has alcanzado el límite mensual para interacciones con el chatbot. Intenta nuevamente el próximo mes.', v_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear los triggers con las nuevas funciones
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
