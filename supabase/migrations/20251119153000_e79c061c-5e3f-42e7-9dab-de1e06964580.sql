-- Mejorar función delete_multiple_calls con mejor manejo de errores y logging
CREATE OR REPLACE FUNCTION public.delete_multiple_calls(call_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  call_id uuid;
  deleted_count integer := 0;
  error_detail text;
BEGIN
  -- Validar que se recibió un array válido
  IF call_ids IS NULL OR array_length(call_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No se proporcionaron IDs de llamadas para eliminar';
  END IF;

  RAISE NOTICE 'Iniciando eliminación de % llamadas', array_length(call_ids, 1);

  -- Iterar sobre cada ID de llamada
  FOREACH call_id IN ARRAY call_ids
  LOOP
    BEGIN
      -- Eliminar mensajes de chat asociados
      DELETE FROM public.call_chat_messages WHERE call_id = call_id;
      
      -- Eliminar feedback asociado
      DELETE FROM public.feedback WHERE call_id = call_id;
      
      -- Eliminar la llamada
      DELETE FROM public.calls WHERE id = call_id;
      
      deleted_count := deleted_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Capturar el error específico para esta llamada
      GET STACKED DIAGNOSTICS error_detail = MESSAGE_TEXT;
      RAISE WARNING 'Error al eliminar llamada %: %', call_id, error_detail;
      -- Continuar con las demás llamadas en lugar de fallar completamente
    END;
  END LOOP;
  
  RAISE NOTICE 'Eliminación completada: % de % llamadas eliminadas exitosamente', deleted_count, array_length(call_ids, 1);
  
  -- Retornar true si se eliminó al menos una llamada
  IF deleted_count > 0 THEN
    RETURN true;
  ELSE
    RAISE EXCEPTION 'No se pudo eliminar ninguna llamada. Verifica los permisos y que las llamadas existan.';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_detail = MESSAGE_TEXT;
    RAISE EXCEPTION 'Error en delete_multiple_calls: %', error_detail;
    RETURN false;
END;
$function$;