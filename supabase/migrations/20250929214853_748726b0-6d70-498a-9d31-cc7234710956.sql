-- Agregar columnas faltantes a account_limits
ALTER TABLE public.account_limits 
ADD COLUMN IF NOT EXISTS limite_mensajes_chat INTEGER DEFAULT 1000;

-- Agregar columnas faltantes a training_sessions
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS mensajes_generales INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mensajes_ia INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mensajes_usuario INTEGER DEFAULT 0;

-- Actualizar la función get_account_detailed_metrics para incluir los nuevos campos
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
  limite_minutos_entrenamiento integer,
  limite_mensajes_chat integer,
  horas_adicionales integer,
  uso_transcripcion_mes numeric,
  uso_consultas_mes bigint,
  uso_chat_llamada_mes bigint,
  uso_chat_general_mes bigint,
  uso_minutos_entrenamiento_mes numeric,
  uso_mensajes_chat_mes bigint,
  tokens_totales_mes bigint,
  costo_total_mes numeric,
  total_grabaciones bigint,
  porcentaje_transcripcion numeric,
  porcentaje_consultas numeric,
  porcentaje_entrenamiento numeric,
  porcentaje_mensajes_chat numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date_from date;
  v_date_to date;
BEGIN
  v_date_from := COALESCE(p_date_from, date_trunc('month', CURRENT_DATE)::date);
  v_date_to := COALESCE(p_date_to, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date);
  
  RETURN QUERY
  SELECT 
    acc.id as account_id,
    acc.name as account_name,
    COALESCE(al.limite_horas, 10) as limite_horas,
    COALESCE(al.limite_consultas, 50) as limite_consultas,
    COALESCE(al.limite_minutos_entrenamiento, 100) as limite_minutos_entrenamiento,
    COALESCE(al.limite_mensajes_chat, 1000) as limite_mensajes_chat,
    COALESCE(al.horas_adicionales, 0) as horas_adicionales,
    
    COALESCE(
      (SELECT SUM(calls_sub.duration) / 3600.0 
       FROM public.calls calls_sub 
       WHERE calls_sub.account_id = acc.id 
       AND calls_sub.date::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as uso_transcripcion_mes,
    
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
    
    COALESCE(
      (SELECT COUNT(*) 
       FROM public.call_chat_messages ccm 
       INNER JOIN public.calls calls_chat ON ccm.call_id = calls_chat.id
       WHERE calls_chat.account_id = acc.id 
       AND ccm.timestamp::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as uso_chat_llamada_mes,
    
    COALESCE(
      (SELECT COUNT(*) 
       FROM public.chat_messages cm 
       WHERE cm.account_id = acc.id 
       AND cm.timestamp::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as uso_chat_general_mes,
    
    COALESCE(
      (SELECT SUM(ts.duration_seconds) / 60.0 
       FROM public.training_sessions ts 
       WHERE ts.account_id = acc.id 
       AND ts.status = 'completed'
       AND ts.type = 'voice'
       AND ts.started_at::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as uso_minutos_entrenamiento_mes,
    
    COALESCE(
      (SELECT SUM(ts.mensajes_ia) 
       FROM public.training_sessions ts 
       WHERE ts.account_id = acc.id 
       AND ts.status = 'completed'
       AND ts.type = 'chat'
       AND ts.started_at::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as uso_mensajes_chat_mes,
    
    COALESCE(
      (SELECT SUM(ut.tokens_used) 
       FROM public.usage_tracking ut 
       WHERE ut.account_id = acc.id 
       AND ut.fecha::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as tokens_totales_mes,
    
    COALESCE(
      (SELECT SUM(ut.costo_usd) 
       FROM public.usage_tracking ut 
       WHERE ut.account_id = acc.id 
       AND ut.fecha::date BETWEEN v_date_from AND v_date_to), 
      0
    ) as costo_total_mes,
    
    COALESCE(
      (SELECT COUNT(*) FROM public.calls calls_count WHERE calls_count.account_id = acc.id), 
      0
    ) as total_grabaciones,
    
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
    
    CASE 
      WHEN COALESCE(al.limite_minutos_entrenamiento, 100) > 0 
      THEN ROUND((
        COALESCE(
          (SELECT SUM(ts.duration_seconds) / 60.0 
           FROM public.training_sessions ts 
           WHERE ts.account_id = acc.id 
           AND ts.status = 'completed'
           AND ts.type = 'voice'
           AND ts.started_at::date BETWEEN v_date_from AND v_date_to), 
          0
        ) / COALESCE(al.limite_minutos_entrenamiento, 100)::numeric * 100
      ), 2)
      ELSE 0 
    END as porcentaje_entrenamiento,
    
    CASE 
      WHEN COALESCE(al.limite_mensajes_chat, 1000) > 0 
      THEN ROUND((
        COALESCE(
          (SELECT SUM(ts.mensajes_ia) 
           FROM public.training_sessions ts 
           WHERE ts.account_id = acc.id 
           AND ts.status = 'completed'
           AND ts.type = 'chat'
           AND ts.started_at::date BETWEEN v_date_from AND v_date_to), 
          0
        ) / COALESCE(al.limite_mensajes_chat, 1000)::numeric * 100
      ), 2)
      ELSE 0 
    END as porcentaje_mensajes_chat
    
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

-- Crear tablas para el sistema de permisos y roles

-- Tabla de módulos del sistema
CREATE TABLE IF NOT EXISTS public.system_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  parent_module_id uuid REFERENCES public.system_modules(id) ON DELETE CASCADE,
  route text,
  icon text,
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla de acciones por módulo
CREATE TABLE IF NOT EXISTS public.module_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.system_modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_name text NOT NULL,
  description text,
  action_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_id, action_key)
);

-- Tabla de permisos por rol
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module_id uuid NOT NULL REFERENCES public.system_modules(id) ON DELETE CASCADE,
  can_access boolean DEFAULT true,
  allowed_actions uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, module_id)
);

-- Tabla de permisos personalizados por usuario
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.system_modules(id) ON DELETE CASCADE,
  can_access boolean DEFAULT true,
  allowed_actions uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Habilitar RLS
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para system_modules
CREATE POLICY "Usuarios autenticados pueden ver módulos"
  ON public.system_modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo superAdmin puede gestionar módulos"
  ON public.system_modules FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Políticas RLS para module_actions
CREATE POLICY "Usuarios autenticados pueden ver acciones"
  ON public.module_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo superAdmin puede gestionar acciones"
  ON public.module_actions FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Políticas RLS para role_permissions
CREATE POLICY "Usuarios pueden ver permisos de su rol"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    OR is_super_admin()
  );

CREATE POLICY "Solo superAdmin puede gestionar permisos de roles"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Políticas RLS para user_permissions
CREATE POLICY "Usuarios pueden ver sus propios permisos"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Solo superAdmin puede gestionar permisos de usuarios"
  ON public.user_permissions FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Insertar módulos base del sistema
INSERT INTO public.system_modules (name, display_name, description, route, icon, order_index) VALUES
  ('analytics', 'Análisis', 'Módulo de análisis y estadísticas', '/analytics', 'BarChart3', 1),
  ('calls', 'Llamadas', 'Gestión de llamadas', '/calls', 'Phone', 2),
  ('chat', 'Consultas IA', 'Chat con inteligencia artificial', '/chat', 'MessageSquare', 3),
  ('formacion', 'Formación', 'Módulo de formación de agentes', '/formacion', 'GraduationCap', 4),
  ('admin-formacion', 'Admin Formación', 'Administración de formación', '/admin-formacion', 'Users', 5),
  ('behaviors', 'Comportamientos', 'Gestión de comportamientos', '/behaviors', 'Brain', 6),
  ('prompts', 'Prompts', 'Gestión de prompts', '/prompts', 'FileText', 7),
  ('accounts', 'Cuentas', 'Gestión de cuentas', '/accounts', 'Building2', 8),
  ('users', 'Usuarios', 'Gestión de usuarios', '/users', 'Users', 9),
  ('limits', 'Límites', 'Configuración de límites', '/limits', 'Activity', 10),
  ('facturacion', 'Facturación', 'Gestión de facturación', '/facturacion', 'FileText', 11),
  ('permissions', 'Permisos', 'Gestión de permisos y roles', '/permissions', 'Shield', 12)
ON CONFLICT (name) DO NOTHING;

-- Insertar acciones para el módulo de llamadas
INSERT INTO public.module_actions (module_id, name, display_name, action_key)
SELECT 
  sm.id,
  'view_calls',
  'Ver llamadas',
  'view_calls'
FROM public.system_modules sm WHERE sm.name = 'calls'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_actions (module_id, name, display_name, action_key)
SELECT 
  sm.id,
  'upload_calls',
  'Subir grabaciones',
  'upload_calls'
FROM public.system_modules sm WHERE sm.name = 'calls'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_actions (module_id, name, display_name, action_key)
SELECT 
  sm.id,
  'select_calls',
  'Seleccionar llamadas',
  'select_calls'
FROM public.system_modules sm WHERE sm.name = 'calls'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_actions (module_id, name, display_name, action_key)
SELECT 
  sm.id,
  'edit_calls',
  'Editar llamadas',
  'edit_calls'
FROM public.system_modules sm WHERE sm.name = 'calls'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_actions (module_id, name, display_name, action_key)
SELECT 
  sm.id,
  'query_calls',
  'Consultas en llamadas',
  'query_calls'
FROM public.system_modules sm WHERE sm.name = 'calls'
ON CONFLICT DO NOTHING;

INSERT INTO public.module_actions (module_id, name, display_name, action_key)
SELECT 
  sm.id,
  'delete_calls',
  'Eliminar llamadas',
  'delete_calls'
FROM public.system_modules sm WHERE sm.name = 'calls'
ON CONFLICT DO NOTHING;

-- Función para verificar permisos
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id uuid,
  p_module_name text,
  p_action_key text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_module_id uuid;
  v_action_id uuid;
  v_has_permission boolean := false;
  v_user_perm_exists boolean := false;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;
  
  -- SuperAdmin tiene todos los permisos
  IF v_user_role = 'superAdmin' THEN
    RETURN true;
  END IF;
  
  -- Obtener ID del módulo
  SELECT id INTO v_module_id FROM public.system_modules WHERE name = p_module_name;
  
  IF v_module_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar si hay permisos personalizados para el usuario
  SELECT EXISTS(
    SELECT 1 FROM public.user_permissions 
    WHERE user_id = p_user_id AND module_id = v_module_id
  ) INTO v_user_perm_exists;
  
  -- Si hay permisos personalizados, usarlos
  IF v_user_perm_exists THEN
    IF p_action_key IS NULL THEN
      -- Solo verificar acceso al módulo
      SELECT can_access INTO v_has_permission
      FROM public.user_permissions
      WHERE user_id = p_user_id AND module_id = v_module_id;
    ELSE
      -- Verificar acción específica
      SELECT id INTO v_action_id 
      FROM public.module_actions 
      WHERE module_id = v_module_id AND action_key = p_action_key;
      
      SELECT can_access AND (v_action_id = ANY(allowed_actions)) INTO v_has_permission
      FROM public.user_permissions
      WHERE user_id = p_user_id AND module_id = v_module_id;
    END IF;
  ELSE
    -- Usar permisos del rol
    IF p_action_key IS NULL THEN
      SELECT can_access INTO v_has_permission
      FROM public.role_permissions
      WHERE role = v_user_role AND module_id = v_module_id;
    ELSE
      SELECT id INTO v_action_id 
      FROM public.module_actions 
      WHERE module_id = v_module_id AND action_key = p_action_key;
      
      SELECT can_access AND (v_action_id = ANY(allowed_actions)) INTO v_has_permission
      FROM public.role_permissions
      WHERE role = v_user_role AND module_id = v_module_id;
    END IF;
  END IF;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$;