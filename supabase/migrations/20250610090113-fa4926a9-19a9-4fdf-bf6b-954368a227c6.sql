
-- Políticas para el bucket call-recordings (solo si no existen)
DO $$
BEGIN
    -- Política para permitir lectura pública de archivos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access Call Recordings') THEN
        CREATE POLICY "Public Access Call Recordings" ON storage.objects
            FOR SELECT
            USING (bucket_id = 'call-recordings');
    END IF;

    -- Política para permitir a usuarios autenticados subir archivos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated Upload Call Recordings') THEN
        CREATE POLICY "Authenticated Upload Call Recordings" ON storage.objects
            FOR INSERT
            WITH CHECK (bucket_id = 'call-recordings' AND auth.role() = 'authenticated');
    END IF;

    -- Política para permitir a usuarios autenticados actualizar archivos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated Update Call Recordings') THEN
        CREATE POLICY "Authenticated Update Call Recordings" ON storage.objects
            FOR UPDATE
            USING (bucket_id = 'call-recordings' AND auth.role() = 'authenticated');
    END IF;

    -- Política para permitir a usuarios autenticados eliminar archivos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated Delete Call Recordings') THEN
        CREATE POLICY "Authenticated Delete Call Recordings" ON storage.objects
            FOR DELETE
            USING (bucket_id = 'call-recordings' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- Función para asegurar que existe la carpeta de la cuenta
CREATE OR REPLACE FUNCTION public.ensure_account_folder(account_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Intentar crear un archivo .keep para asegurar que la carpeta existe
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('call-recordings', account_uuid::text || '/.keep', auth.uid(), '{}')
  ON CONFLICT (bucket_id, name) DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;
