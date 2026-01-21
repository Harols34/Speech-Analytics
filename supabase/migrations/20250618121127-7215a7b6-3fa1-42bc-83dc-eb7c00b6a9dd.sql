
-- Crear políticas RLS para la tabla calls si no existen
DO $$ 
BEGIN
    -- Verificar si RLS está habilitado en calls
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'calls' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Política para que los usuarios puedan ver las llamadas de sus cuentas
DROP POLICY IF EXISTS "Users can view calls from their accounts" ON public.calls;
CREATE POLICY "Users can view calls from their accounts" ON public.calls
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Política para insertar llamadas
DROP POLICY IF EXISTS "Users can insert calls to their accounts" ON public.calls;
CREATE POLICY "Users can insert calls to their accounts" ON public.calls
  FOR INSERT WITH CHECK (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Política para actualizar llamadas
DROP POLICY IF EXISTS "Users can update calls from their accounts" ON public.calls;
CREATE POLICY "Users can update calls from their accounts" ON public.calls
  FOR UPDATE USING (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Crear políticas RLS para la tabla chat_messages si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'chat_messages' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Política para chat_messages
DROP POLICY IF EXISTS "Users can view chat messages from their accounts" ON public.chat_messages;
CREATE POLICY "Users can view chat messages from their accounts" ON public.chat_messages
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Política para insertar chat_messages
DROP POLICY IF EXISTS "Users can insert chat messages to their accounts" ON public.chat_messages;
CREATE POLICY "Users can insert chat messages to their accounts" ON public.chat_messages
  FOR INSERT WITH CHECK (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Crear políticas RLS para la tabla call_chat_messages si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'call_chat_messages' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.call_chat_messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Política para call_chat_messages
DROP POLICY IF EXISTS "Users can view call chat messages from accessible calls" ON public.call_chat_messages;
CREATE POLICY "Users can view call chat messages from accessible calls" ON public.call_chat_messages
  FOR SELECT USING (
    call_id IN (
      SELECT c.id FROM public.calls c
      WHERE c.account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Política para insertar call_chat_messages
DROP POLICY IF EXISTS "Users can insert call chat messages to accessible calls" ON public.call_chat_messages;
CREATE POLICY "Users can insert call chat messages to accessible calls" ON public.call_chat_messages
  FOR INSERT WITH CHECK (
    call_id IN (
      SELECT c.id FROM public.calls c
      WHERE c.account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Crear políticas RLS para usage_tracking si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'usage_tracking' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Política para usage_tracking
DROP POLICY IF EXISTS "Users can view usage from their accounts" ON public.usage_tracking;
CREATE POLICY "Users can view usage from their accounts" ON public.usage_tracking
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Política para insertar en usage_tracking
DROP POLICY IF EXISTS "Users can insert usage for their accounts" ON public.usage_tracking;
CREATE POLICY "Users can insert usage for their accounts" ON public.usage_tracking
  FOR INSERT WITH CHECK (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Crear políticas RLS para account_limits si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'account_limits' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.account_limits ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Política para account_limits
DROP POLICY IF EXISTS "Users can view limits from their accounts" ON public.account_limits;
CREATE POLICY "Users can view limits from their accounts" ON public.account_limits
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Política para accounts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'accounts' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DROP POLICY IF EXISTS "Users can view their accounts" ON public.accounts;
CREATE POLICY "Users can view their accounts" ON public.accounts
  FOR SELECT USING (
    id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  );

-- Función para obtener métricas detalladas por cuenta (CORREGIDA)
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
    acc.id,
    acc.name,
    COALESCE(al.limite_horas, 10) as limite_horas,
    COALESCE(al.limite_consultas, 50) as limite_consultas,
    COALESCE(al.horas_adicionales, 0) as horas_adicionales,
    
    -- Uso de transcripción (convertir segundos a horas)
    COALESCE(
      (SELECT SUM(calls.duration) / 3600.0 
       FROM public.calls calls
       WHERE calls.account_id = acc.id 
       AND calls.date::date BETWEEN v_date_from AND v_date_to), 
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
         JOIN public.calls calls_sub ON ccm.call_id = calls_sub.id
         WHERE calls_sub.account_id = acc.id 
         AND ccm.timestamp::date BETWEEN v_date_from AND v_date_to), 
        0
      )
    ) as uso_consultas_mes,
    
    -- Chat por llamada
    COALESCE(
      (SELECT COUNT(*) 
       FROM public.call_chat_messages ccm 
       JOIN public.calls calls_sub ON ccm.call_id = calls_sub.id
       WHERE calls_sub.account_id = acc.id 
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
          (SELECT SUM(calls.duration) / 3600.0 
           FROM public.calls calls
           WHERE calls.account_id = acc.id 
           AND calls.date::date BETWEEN v_date_from AND v_date_to), 
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
             JOIN public.calls calls_sub ON ccm.call_id = calls_sub.id
             WHERE calls_sub.account_id = acc.id 
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
