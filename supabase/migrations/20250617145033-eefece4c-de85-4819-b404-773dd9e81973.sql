
-- Verificar y actualizar la tabla account_limits para soportar horas adicionales
ALTER TABLE public.account_limits 
ADD COLUMN IF NOT EXISTS horas_adicionales integer DEFAULT 0;

-- Verificar y actualizar la tabla usage_tracking para soportar tokens y costos
ALTER TABLE public.usage_tracking 
ADD COLUMN IF NOT EXISTS tokens_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS modelo_openai text,
ADD COLUMN IF NOT EXISTS subtipo text; -- Para diferenciar chat_llamada vs chat_general

-- Crear vista para el dashboard de límites con métricas en tiempo real
CREATE OR REPLACE VIEW public.limits_dashboard_v2 AS
SELECT 
  a.id as account_id,
  a.name as account_name,
  al.limite_horas,
  al.limite_consultas,
  al.horas_adicionales,
  
  -- Uso de transcripción del mes actual
  COALESCE(SUM(CASE WHEN ut.tipo = 'transcripcion' AND ut.fecha >= date_trunc('month', CURRENT_DATE) 
                   THEN ut.cantidad ELSE 0 END), 0) as uso_transcripcion_mes,
                   
  -- Uso de consultas del mes actual (ambos tipos)
  COALESCE(SUM(CASE WHEN ut.tipo = 'chat' AND ut.fecha >= date_trunc('month', CURRENT_DATE) 
                   THEN ut.cantidad ELSE 0 END), 0) as uso_consultas_mes,
                   
  -- Uso de consultas chat_llamada del mes actual
  COALESCE(SUM(CASE WHEN ut.tipo = 'chat' AND ut.subtipo = 'chat_llamada' AND ut.fecha >= date_trunc('month', CURRENT_DATE) 
                   THEN ut.cantidad ELSE 0 END), 0) as uso_chat_llamada_mes,
                   
  -- Uso de consultas chat_general del mes actual
  COALESCE(SUM(CASE WHEN ut.tipo = 'chat' AND ut.subtipo = 'chat_general' AND ut.fecha >= date_trunc('month', CURRENT_DATE) 
                   THEN ut.cantidad ELSE 0 END), 0) as uso_chat_general_mes,
                   
  -- Total de tokens utilizados del mes actual
  COALESCE(SUM(CASE WHEN ut.fecha >= date_trunc('month', CURRENT_DATE) 
                   THEN ut.tokens_used ELSE 0 END), 0) as tokens_totales_mes,
                   
  -- Costo total del mes actual
  COALESCE(SUM(CASE WHEN ut.fecha >= date_trunc('month', CURRENT_DATE) 
                   THEN ut.costo_usd ELSE 0 END), 0) as costo_total_mes,
                   
  -- Total de grabaciones procesadas (llamadas)
  (SELECT COUNT(*) FROM public.calls WHERE account_id = a.id) as total_grabaciones,
  
  -- Porcentajes de uso
  CASE 
    WHEN (al.limite_horas + COALESCE(al.horas_adicionales, 0)) > 0 
    THEN ROUND((COALESCE(SUM(CASE WHEN ut.tipo = 'transcripcion' AND ut.fecha >= date_trunc('month', CURRENT_DATE) 
                               THEN ut.cantidad ELSE 0 END), 0) / (al.limite_horas + COALESCE(al.horas_adicionales, 0)) * 100), 2)
    ELSE 0 
  END as porcentaje_transcripcion,
  
  CASE 
    WHEN al.limite_consultas > 0 
    THEN ROUND((COALESCE(SUM(CASE WHEN ut.tipo = 'chat' AND ut.fecha >= date_trunc('month', CURRENT_DATE) 
                               THEN ut.cantidad ELSE 0 END), 0) / al.limite_consultas * 100), 2)
    ELSE 0 
  END as porcentaje_consultas

FROM public.accounts a
LEFT JOIN public.account_limits al ON a.id = al.account_id
LEFT JOIN public.usage_tracking ut ON a.id = ut.account_id
GROUP BY a.id, a.name, al.limite_horas, al.limite_consultas, al.horas_adicionales;

-- Crear función para verificar límites mejorada
CREATE OR REPLACE FUNCTION public.check_account_limits_v2(p_account_id uuid, p_tipo text, p_subtipo text DEFAULT NULL)
RETURNS TABLE(
  limite_alcanzado boolean, 
  uso_actual numeric, 
  limite_total integer, 
  porcentaje_uso numeric,
  horas_adicionales integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  
  -- Calcular uso actual del mes
  IF p_subtipo IS NOT NULL THEN
    SELECT COALESCE(SUM(cantidad), 0) INTO v_uso_actual
    FROM public.usage_tracking
    WHERE account_id = p_account_id
      AND tipo = p_tipo
      AND subtipo = p_subtipo
      AND fecha >= v_fecha_inicio;
  ELSE
    SELECT COALESCE(SUM(cantidad), 0) INTO v_uso_actual
    FROM public.usage_tracking
    WHERE account_id = p_account_id
      AND tipo = p_tipo
      AND fecha >= v_fecha_inicio;
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
$function$;

-- Crear función para registrar uso mejorada
CREATE OR REPLACE FUNCTION public.register_usage_v2(
  p_account_id uuid, 
  p_tipo text, 
  p_cantidad numeric, 
  p_origen uuid DEFAULT NULL,
  p_costo_usd numeric DEFAULT 0,
  p_tokens_used integer DEFAULT 0,
  p_modelo_openai text DEFAULT NULL,
  p_subtipo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.usage_tracking (
    account_id,
    tipo,
    cantidad,
    origen,
    costo_usd,
    tokens_used,
    modelo_openai,
    subtipo
  ) VALUES (
    p_account_id,
    p_tipo,
    p_cantidad,
    COALESCE(p_origen, auth.uid()),
    p_costo_usd,
    p_tokens_used,
    p_modelo_openai,
    p_subtipo
  );
END;
$function$;

-- Crear función para ampliar horas adicionales (solo superAdmin)
CREATE OR REPLACE FUNCTION public.ampliar_horas_adicionales(p_account_id uuid, p_horas_adicionales integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Verificar que el usuario es superAdmin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superAdmin'
  ) THEN
    RAISE EXCEPTION 'Solo los superAdmin pueden ampliar horas adicionales';
  END IF;
  
  -- Actualizar o crear registro de límites
  INSERT INTO public.account_limits (account_id, horas_adicionales)
  VALUES (p_account_id, p_horas_adicionales)
  ON CONFLICT (account_id) 
  DO UPDATE SET 
    horas_adicionales = EXCLUDED.horas_adicionales,
    updated_at = now();
    
  RETURN true;
END;
$function$;
