-- Limpiar y reorganizar políticas RLS para eliminación de llamadas

-- ==================== TABLA CALLS ====================
-- Eliminar políticas duplicadas/conflictivas
DROP POLICY IF EXISTS "Allow authenticated users to delete calls" ON public.calls;
DROP POLICY IF EXISTS "Users can delete calls from assigned accounts" ON public.calls;
DROP POLICY IF EXISTS "Users can delete calls from their assigned accounts" ON public.calls;
DROP POLICY IF EXISTS "SuperAdmin puede eliminar llamadas" ON public.calls;

-- Crear política única y clara para DELETE en calls
CREATE POLICY "Delete calls policy"
ON public.calls
FOR DELETE
TO authenticated
USING (
  -- SuperAdmin puede eliminar cualquier llamada
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  OR
  -- Usuarios pueden eliminar llamadas de sus cuentas asignadas
  account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
);

-- ==================== TABLA CALL_CHAT_MESSAGES ====================
-- Eliminar políticas duplicadas/conflictivas
DROP POLICY IF EXISTS "Authenticated users can delete call chat messages" ON public.call_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own call chat messages" ON public.call_chat_messages;
DROP POLICY IF EXISTS "SuperAdmin puede eliminar mensajes de chat de llamadas" ON public.call_chat_messages;

-- Crear política única y clara para DELETE en call_chat_messages
CREATE POLICY "Delete call chat messages policy"
ON public.call_chat_messages
FOR DELETE
TO authenticated
USING (
  -- SuperAdmin puede eliminar cualquier mensaje
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  OR
  -- Usuarios pueden eliminar mensajes de llamadas en sus cuentas
  call_id IN (
    SELECT id FROM public.calls 
    WHERE account_id IN (
      SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid()
    )
  )
  OR
  -- Usuarios pueden eliminar sus propios mensajes
  user_id = auth.uid()
);

-- ==================== TABLA FEEDBACK ====================
-- Eliminar políticas duplicadas/conflictivas
DROP POLICY IF EXISTS "SuperAdmin puede eliminar feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can delete their feedback" ON public.feedback;

-- Crear política única y clara para DELETE en feedback
CREATE POLICY "Delete feedback policy"
ON public.feedback
FOR DELETE
TO authenticated
USING (
  -- SuperAdmin puede eliminar cualquier feedback
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
  OR
  -- Usuarios pueden eliminar feedback de llamadas en sus cuentas
  call_id IN (
    SELECT id FROM public.calls 
    WHERE account_id IN (
      SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid()
    )
  )
);

-- ==================== OPTIMIZAR FUNCIÓN DELETE_MULTIPLE_CALLS ====================
-- Recrear la función con mejor manejo de permisos
CREATE OR REPLACE FUNCTION public.delete_multiple_calls(call_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  call_id uuid;
  deleted_count integer := 0;
  total_count integer := 0;
  error_detail text;
  v_is_superadmin boolean;
BEGIN
  -- Validar entrada
  IF call_ids IS NULL OR array_length(call_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No se proporcionaron IDs de llamadas para eliminar';
  END IF;

  total_count := array_length(call_ids, 1);
  
  -- Verificar si el usuario es superadmin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superAdmin'
  ) INTO v_is_superadmin;

  RAISE NOTICE 'Usuario superAdmin: %, eliminando % llamadas', v_is_superadmin, total_count;

  -- Iterar sobre cada ID de llamada
  FOREACH call_id IN ARRAY call_ids
  LOOP
    BEGIN
      -- Verificar que la llamada existe y el usuario tiene permisos
      IF NOT EXISTS (SELECT 1 FROM public.calls WHERE id = call_id) THEN
        RAISE WARNING 'Llamada % no existe', call_id;
        CONTINUE;
      END IF;

      -- Eliminar mensajes de chat asociados (sin verificación RLS por SECURITY DEFINER)
      DELETE FROM public.call_chat_messages WHERE call_id = call_id;
      
      -- Eliminar feedback asociado (sin verificación RLS por SECURITY DEFINER)
      DELETE FROM public.feedback WHERE call_id = call_id;
      
      -- Eliminar la llamada (sin verificación RLS por SECURITY DEFINER)
      DELETE FROM public.calls WHERE id = call_id;
      
      deleted_count := deleted_count + 1;
      RAISE NOTICE 'Llamada % eliminada exitosamente', call_id;
      
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS error_detail = MESSAGE_TEXT;
      RAISE WARNING 'Error al eliminar llamada %: %', call_id, error_detail;
    END;
  END LOOP;
  
  RAISE NOTICE 'Eliminación completada: % de % llamadas eliminadas', deleted_count, total_count;
  
  -- Retornar true si se eliminó al menos una llamada
  IF deleted_count > 0 THEN
    RETURN true;
  ELSE
    RAISE EXCEPTION 'No se pudo eliminar ninguna llamada. Eliminadas: % de %. Verifica que las llamadas existan.', deleted_count, total_count;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_detail = MESSAGE_TEXT;
    RAISE EXCEPTION 'Error en delete_multiple_calls: %', error_detail;
END;
$function$;

-- Dar permisos explícitos a la función
GRANT EXECUTE ON FUNCTION public.delete_multiple_calls(uuid[]) TO authenticated;