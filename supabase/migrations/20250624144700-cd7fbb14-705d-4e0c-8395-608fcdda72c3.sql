
-- Crear función para eliminar llamadas junto con sus mensajes de chat asociados
CREATE OR REPLACE FUNCTION public.delete_call_with_messages(call_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Primero eliminar los mensajes de chat asociados a la llamada
  DELETE FROM public.call_chat_messages WHERE call_id = call_id_param;
  
  -- Luego eliminar el feedback asociado a la llamada
  DELETE FROM public.feedback WHERE call_id = call_id_param;
  
  -- Finalmente eliminar la llamada
  DELETE FROM public.calls WHERE id = call_id_param;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Crear función para eliminar múltiples llamadas
CREATE OR REPLACE FUNCTION public.delete_multiple_calls(call_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  call_id uuid;
BEGIN
  -- Iterar sobre cada ID de llamada
  FOREACH call_id IN ARRAY call_ids
  LOOP
    -- Eliminar mensajes de chat asociados
    DELETE FROM public.call_chat_messages WHERE call_id = call_id;
    
    -- Eliminar feedback asociado
    DELETE FROM public.feedback WHERE call_id = call_id;
  END LOOP;
  
  -- Finalmente eliminar todas las llamadas
  DELETE FROM public.calls WHERE id = ANY(call_ids);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Crear función para limpiar completamente la plataforma (solo para superAdmin)
CREATE OR REPLACE FUNCTION public.clean_platform()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario es superAdmin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superAdmin'
  ) THEN
    RAISE EXCEPTION 'Solo los superAdmin pueden limpiar la plataforma';
  END IF;
  
  -- Eliminar todos los mensajes de chat de llamadas
  DELETE FROM public.call_chat_messages;
  
  -- Eliminar todos los feedbacks
  DELETE FROM public.feedback;
  
  -- Eliminar todas las llamadas
  DELETE FROM public.calls;
  
  -- Eliminar mensajes de chat general
  DELETE FROM public.chat_messages;
  
  -- Limpiar tracking de uso
  DELETE FROM public.usage_tracking;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;
