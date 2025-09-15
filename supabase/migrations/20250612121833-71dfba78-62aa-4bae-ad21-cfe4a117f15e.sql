
-- Crear el bucket call-recordings si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('call-recordings', 'call-recordings', true, 104857600, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg'];

-- Crear políticas para el bucket call-recordings
-- Política para permitir INSERT (subir archivos)
CREATE POLICY "Allow authenticated users to upload call recordings" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'call-recordings' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir SELECT (leer archivos)
CREATE POLICY "Allow authenticated users to read call recordings" ON storage.objects
FOR SELECT USING (
  bucket_id = 'call-recordings' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir UPDATE (actualizar archivos)
CREATE POLICY "Allow authenticated users to update call recordings" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'call-recordings' AND 
  auth.role() = 'authenticated'
) WITH CHECK (
  bucket_id = 'call-recordings' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir DELETE (eliminar archivos)
CREATE POLICY "Allow authenticated users to delete call recordings" ON storage.objects
FOR DELETE USING (
  bucket_id = 'call-recordings' AND 
  auth.role() = 'authenticated'
);
