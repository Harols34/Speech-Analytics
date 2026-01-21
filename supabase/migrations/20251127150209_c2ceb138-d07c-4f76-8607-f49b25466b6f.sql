
-- Función para verificar si un usuario tiene permisos en un módulo específico (incluye roles personalizados)
CREATE OR REPLACE FUNCTION public.user_has_module_permission(p_user_id uuid, p_module_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_module_id uuid;
  v_has_permission boolean := false;
BEGIN
  -- SuperAdmin siempre tiene permiso
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'superAdmin') THEN
    RETURN true;
  END IF;

  -- Obtener rol del usuario
  SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;
  
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Obtener ID del módulo
  SELECT id INTO v_module_id FROM public.system_modules WHERE name = p_module_name;
  
  IF v_module_id IS NULL THEN
    RETURN false;
  END IF;

  -- Primero verificar permisos personalizados del usuario
  SELECT can_access INTO v_has_permission
  FROM public.user_permissions
  WHERE user_id = p_user_id AND module_id = v_module_id;

  IF v_has_permission IS NOT NULL THEN
    RETURN v_has_permission;
  END IF;

  -- Si no hay permisos personalizados, verificar permisos del rol
  SELECT can_access INTO v_has_permission
  FROM public.role_permissions
  WHERE role = v_user_role AND module_id = v_module_id;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Función para verificar si usuario puede gestionar escenarios de entrenamiento
CREATE OR REPLACE FUNCTION public.can_manage_training()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.user_has_module_permission(auth.uid(), 'training_admin')
      OR public.user_has_module_permission(auth.uid(), 'training')
      OR public.has_elevated_role(auth.uid())
      OR public.is_super_admin();
END;
$$;

-- Función para verificar si usuario puede ver/participar en formación
CREATE OR REPLACE FUNCTION public.can_access_training()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.user_has_module_permission(auth.uid(), 'training')
      OR public.user_has_module_permission(auth.uid(), 'training_admin')
      OR public.is_super_admin();
END;
$$;

-- Actualizar políticas de scenario_assignments
DROP POLICY IF EXISTS "elevated_can_manage_assignments" ON public.scenario_assignments;
DROP POLICY IF EXISTS "select_own_or_elevated_assignments" ON public.scenario_assignments;
DROP POLICY IF EXISTS "Users can view their assignments" ON public.scenario_assignments;
DROP POLICY IF EXISTS "allow user update own assignment status" ON public.scenario_assignments;

-- Política SELECT: usuarios ven sus propias asignaciones o tienen permisos de gestión
CREATE POLICY "users_view_assignments"
ON public.scenario_assignments
FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.can_manage_training()
  OR account_id IN (SELECT get_user_accounts())
);

-- Política INSERT: usuarios con permisos de gestión pueden asignar
CREATE POLICY "users_insert_assignments"
ON public.scenario_assignments
FOR INSERT
WITH CHECK (
  public.can_manage_training()
  OR account_id IN (SELECT get_user_accounts())
);

-- Política UPDATE: dueño puede actualizar su estado o usuarios con permisos de gestión
CREATE POLICY "users_update_assignments"
ON public.scenario_assignments
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR public.can_manage_training()
);

-- Política DELETE: solo usuarios con permisos de gestión
CREATE POLICY "users_delete_assignments"
ON public.scenario_assignments
FOR DELETE
USING (
  public.can_manage_training()
);

-- Actualizar políticas de training_scenarios para roles personalizados
DROP POLICY IF EXISTS "Users can manage scenarios from assigned accounts" ON public.training_scenarios;
DROP POLICY IF EXISTS "Users can view scenarios from assigned accounts" ON public.training_scenarios;

CREATE POLICY "users_view_training_scenarios"
ON public.training_scenarios
FOR SELECT
USING (
  public.can_access_training()
  OR account_id IN (SELECT get_user_accounts())
  OR is_active = true
);

CREATE POLICY "users_manage_training_scenarios"
ON public.training_scenarios
FOR ALL
USING (
  public.can_manage_training()
  OR account_id IN (SELECT get_user_accounts())
);

-- Actualizar políticas de training_sessions para roles personalizados
DROP POLICY IF EXISTS "Users can manage training sessions from assigned accounts" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can view training sessions from assigned accounts" ON public.training_sessions;

CREATE POLICY "users_view_training_sessions"
ON public.training_sessions
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.can_manage_training()
  OR account_id IN (SELECT get_user_accounts())
);

CREATE POLICY "users_insert_training_sessions"
ON public.training_sessions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.can_manage_training()
);

CREATE POLICY "users_update_training_sessions"
ON public.training_sessions
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.can_manage_training()
);
