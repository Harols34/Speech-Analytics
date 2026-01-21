
-- Corregir la función get_account_detailed_metrics para eliminar ambigüedad de columnas
DROP FUNCTION IF EXISTS public.get_account_detailed_metrics(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_account_detailed_metrics(
  p_account_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS TABLE(
  account_id uuid,
  account_name text,
  limite_horas integer,
  limite_consultas integer,
  horas_adicionales integer,
  uso_transcripcion_mes numeric,
  uso_consultas_mes bigint,
  uso_chat_llamada_mes bigint,
  uso_chat_general_mes bigint,
  tokens_totales_mes bigint,
  costo_total_mes numeric,
  total_grabaciones bigint,
  porcentaje_transcripcion numeric,
  porcentaje_consultas numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    END as porcentaje_consultas
    
  FROM public.accounts acc
  LEFT JOIN public.account_limits al ON acc.id = al.account_id
  WHERE (p_account_id IS NULL OR acc.id = p_account_id)
  AND (
    acc.id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin')
  )
  ORDER BY acc.name;
END;
$$;

-- Asegurar que las políticas RLS están correctamente configuradas
-- Política para account_limits (solo lectura para configuración)
DROP POLICY IF EXISTS "Users can update limits for their accounts" ON public.account_limits;
CREATE POLICY "Users can update limits for their accounts" ON public.account_limits
  FOR UPDATE USING (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Política para insertar límites (solo superAdmin)
DROP POLICY IF EXISTS "SuperAdmin can insert limits" ON public.account_limits;
CREATE POLICY "SuperAdmin can insert limits" ON public.account_limits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );
