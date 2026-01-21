-- Crear políticas RLS para permitir eliminación de llamadas
-- Políticas para tabla calls
DROP POLICY IF EXISTS "SuperAdmin puede eliminar llamadas" ON public.calls;
CREATE POLICY "SuperAdmin puede eliminar llamadas"
ON public.calls
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superAdmin'
  )
);

-- Políticas para tabla call_chat_messages
DROP POLICY IF EXISTS "SuperAdmin puede eliminar mensajes de chat de llamadas" ON public.call_chat_messages;
CREATE POLICY "SuperAdmin puede eliminar mensajes de chat de llamadas"
ON public.call_chat_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superAdmin'
  )
);

-- Políticas para tabla feedback
DROP POLICY IF EXISTS "SuperAdmin puede eliminar feedback" ON public.feedback;
CREATE POLICY "SuperAdmin puede eliminar feedback"
ON public.feedback
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superAdmin'
  )
);