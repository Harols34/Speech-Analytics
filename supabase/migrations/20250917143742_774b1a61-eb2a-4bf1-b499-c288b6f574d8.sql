-- Agregar columna para límites de minutos de entrenamiento
ALTER TABLE public.account_limits 
ADD COLUMN IF NOT EXISTS limite_minutos_entrenamiento INTEGER DEFAULT 100;

-- Actualizar la función check_account_limits_v2 para incluir minutos de entrenamiento
CREATE OR REPLACE FUNCTION public.check_account_limits_v2(p_account_id uuid, p_tipo text, p_subtipo text DEFAULT NULL::text)
RETURNS TABLE(limite_alcanzado boolean, uso_actual numeric, limite_total integer, porcentaje_uso numeric, horas_adicionales integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  ELSIF p_tipo = 'entrenamiento' THEN
    SELECT al.limite_minutos_entrenamiento 
    INTO v_limite
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
    v_limite := CASE 
      WHEN p_tipo = 'transcripcion' THEN 10 
      WHEN p_tipo = 'entrenamiento' THEN 100
      ELSE 50 
    END;
  END IF;
  
  -- Calcular uso actual del mes DIRECTAMENTE de las tablas principales para esta cuenta específica
  IF p_tipo = 'transcripcion' THEN
    -- Para transcripción, usar la tabla calls directamente para esta cuenta
    SELECT COALESCE(SUM(c.duration) / 3600.0, 0) INTO v_uso_actual
    FROM public.calls c
    WHERE c.account_id = p_account_id
    AND c.date::date >= v_fecha_inicio;
    
  ELSIF p_tipo = 'entrenamiento' THEN
    -- Para entrenamiento, calcular minutos de las sesiones completadas
    SELECT COALESCE(SUM(ts.duration_seconds) / 60.0, 0) INTO v_uso_actual
    FROM public.training_sessions ts
    WHERE ts.account_id = p_account_id
    AND ts.status = 'completed'
    AND ts.started_at::date >= v_fecha_inicio;
    
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
$function$;

-- Crear función para verificar límites de entrenamiento
CREATE OR REPLACE FUNCTION public.can_train_for_account(p_account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit_result RECORD;
BEGIN
  -- Verificar límites específicos de entrenamiento para esta cuenta
  SELECT * INTO v_limit_result 
  FROM public.check_account_limits_v2(p_account_id, 'entrenamiento', NULL);
  
  -- Retornar si puede entrenar (false si límite alcanzado)
  RETURN NOT v_limit_result.limite_alcanzado;
END;
$function$;

-- Eliminar la función existente primero
DROP FUNCTION IF EXISTS public.get_account_detailed_metrics(uuid, date, date);

-- Crear la nueva función con el tipo de retorno actualizado
CREATE OR REPLACE FUNCTION public.get_account_detailed_metrics(p_account_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
RETURNS TABLE(account_id uuid, account_name text, limite_horas integer, limite_consultas integer, limite_minutos_entrenamiento integer, horas_adicionales integer, uso_transcripcion_mes numeric, uso_consultas_mes bigint, uso_chat_llamada_mes bigint, uso_chat_general_mes bigint, uso_minutos_entrenamiento_mes numeric, tokens_totales_mes bigint, costo_total_mes numeric, total_grabaciones bigint, porcentaje_transcripcion numeric, porcentaje_consultas numeric, porcentaje_entrenamiento numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_date_from date;
  v_date_to date;
BEGIN
  -- Establecer fechas por defecto si no se proporcionan
  v_date_from := COALESCE(p_date_from, date_trunc('month', CURRENT_DATE)::date);
  v_date_to := COALESCE(p_date_to, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date);
  
  RETURN QUERY
  SELECT 
    acc.id as account_id,
    acc.name as account_name,
    COALESCE(al.limite_horas, 10) as limite_horas,
    COALESCE(al.limite_consultas, 50) as limite_consultas,
    COALESCE(al.limite_minutos_entrenamiento, 100) as limite_minutos_entrenamiento,
    COALESCE(al.horas_adicionales, 0) as horas_adicionales,
    
    -- Uso de transcripción (convertir segundos a horas)
    COALESCE(
      (SELECT SUM(calls_sub.duration) / 3600.0 
       FROM public.calls calls_sub 
       WHERE calls_sub.account_id = acc.id 
       AND calls_sub.date::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as uso_transcripcion_mes,
    
    -- Total de consultas (chat general + chat por llamada)
    (
      COALESCE(
        (SELECT COUNT(*) 
         FROM public.chat_messages cm 
         WHERE cm.account_id = acc.id 
         AND cm.timestamp::date BETWEEN v_date_from AND v_date_to), 
        0
      ) + 
      COALESCE(
        (SELECT COUNT(*) 
         FROM public.call_chat_messages ccm 
         INNER JOIN public.calls calls_chat ON ccm.call_id = calls_chat.id
         WHERE calls_chat.account_id = acc.id 
         AND ccm.timestamp::date BETWEEN v_date_from AND v_date_to), 
        0
      )
    ) as uso_consultas_mes,
    
    -- Chat por llamada
    COALESCE(
      (SELECT COUNT(*) 
       FROM public.call_chat_messages ccm 
       INNER JOIN public.calls calls_chat ON ccm.call_id = calls_chat.id
       WHERE calls_chat.account_id = acc.id 
       AND ccm.timestamp::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as uso_chat_llamada_mes,
    
    -- Chat general
    COALESCE(
      (SELECT COUNT(*) 
       FROM public.chat_messages cm 
       WHERE cm.account_id = acc.id 
       AND cm.timestamp::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as uso_chat_general_mes,
    
    -- Minutos de entrenamiento
    COALESCE(
      (SELECT SUM(ts.duration_seconds) / 60.0 
       FROM public.training_sessions ts 
       WHERE ts.account_id = acc.id 
       AND ts.status = 'completed'
       AND ts.started_at::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as uso_minutos_entrenamiento_mes,
    
    -- Tokens totales del usage_tracking
    COALESCE(
      (SELECT SUM(ut.tokens_used) 
       FROM public.usage_tracking ut 
       WHERE ut.account_id = acc.id 
       AND ut.fecha::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as tokens_totales_mes,
    
    -- Costo total del usage_tracking
    COALESCE(
      (SELECT SUM(ut.costo_usd) 
       FROM public.usage_tracking ut 
       WHERE ut.account_id = acc.id 
       AND ut.fecha::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as costo_total_mes,
    
    -- Total de grabaciones/llamadas
    COALESCE(
      (SELECT COUNT(*) FROM public.calls calls_count WHERE calls_count.account_id = acc.id), 
      0
    ) as total_grabaciones,
    
    -- Porcentaje de transcripción
    CASE 
      WHEN (COALESCE(al.limite_horas, 10) + COALESCE(al.horas_adicionales, 0)) > 0 
      THEN ROUND((
        COALESCE(
          (SELECT SUM(calls_sub.duration) / 3600.0 
           FROM public.calls calls_sub 
           WHERE calls_sub.account_id = acc.id 
           AND calls_sub.date::date BETWEEN v_date_from AND v_date_to), 
          0
        ) / (COALESCE(al.limite_horas, 10) + COALESCE(al.horas_adicionales, 0)) * 100
      ), 2)
      ELSE 0 
    END as porcentaje_transcripcion,
    
    -- Porcentaje de consultas
    CASE 
      WHEN COALESCE(al.limite_consultas, 50) > 0 
      THEN ROUND((
        (
          COALESCE(
            (SELECT COUNT(*) 
             FROM public.chat_messages cm 
             WHERE cm.account_id = acc.id 
             AND cm.timestamp::date BETWEEN v_date_from AND v_date_to), 
            0
          ) + 
          COALESCE(
            (SELECT COUNT(*) 
             FROM public.call_chat_messages ccm 
             INNER JOIN public.calls calls_chat ON ccm.call_id = calls_chat.id
             WHERE calls_chat.account_id = acc.id 
             AND ccm.timestamp::date BETWEEN v_date_from AND v_date_to), 
            0
          )
        ) / COALESCE(al.limite_consultas, 50)::numeric * 100
      ), 2)
      ELSE 0 
    END as porcentaje_consultas,
    
    -- Porcentaje de entrenamiento
    CASE 
      WHEN COALESCE(al.limite_minutos_entrenamiento, 100) > 0 
      THEN ROUND((
        COALESCE(
          (SELECT SUM(ts.duration_seconds) / 60.0 
           FROM public.training_sessions ts 
           WHERE ts.account_id = acc.id 
           AND ts.status = 'completed'
           AND ts.started_at::date BETWEEN v_date_from AND v_date_to), 
          0
        ) / COALESCE(al.limite_minutos_entrenamiento, 100)::numeric * 100
      ), 2)
      ELSE 0 
    END as porcentaje_entrenamiento
    
  FROM public.accounts acc
  LEFT JOIN public.account_limits al ON acc.id = al.account_id
  WHERE (p_account_id IS NULL OR acc.id = p_account_id)
  AND (
    acc.id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin')
  )
  ORDER BY acc.name;
END;
$function$;

-- Crear trigger para verificar límites de entrenamiento antes de crear una sesión de entrenamiento
CREATE OR REPLACE FUNCTION public.check_training_limit_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_can_train BOOLEAN;
BEGIN
  -- Solo verificar si la sesión tiene account_id
  IF NEW.account_id IS NOT NULL THEN
    -- Verificar si esta cuenta específica puede crear sesiones de entrenamiento
    SELECT public.can_train_for_account(NEW.account_id) INTO v_can_train;
    
    -- Si no puede entrenar, bloquear la inserción con mensaje específico
    IF NOT v_can_train THEN
      RAISE EXCEPTION 'Límite de minutos de entrenamiento alcanzado para la cuenta %. Has alcanzado el límite mensual para sesiones de entrenamiento. Intenta nuevamente el próximo mes.', NEW.account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Aplicar el trigger a la tabla training_sessions
DROP TRIGGER IF EXISTS trigger_check_training_limit ON public.training_sessions;
CREATE TRIGGER trigger_check_training_limit
  BEFORE INSERT ON public.training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_training_limit_before_insert();