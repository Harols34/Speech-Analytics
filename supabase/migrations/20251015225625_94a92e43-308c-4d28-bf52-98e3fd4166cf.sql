-- Crear bucket para grabaciones de sesiones de entrenamiento
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-recordings', 'training-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso para training-recordings
CREATE POLICY "Usuarios pueden subir sus propias grabaciones de entrenamiento"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'training-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuarios pueden ver sus propias grabaciones de entrenamiento"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'training-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuarios pueden eliminar sus propias grabaciones de entrenamiento"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- SuperAdmins pueden acceder a todas las grabaciones
CREATE POLICY "SuperAdmins pueden ver todas las grabaciones de entrenamiento"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'training-recordings' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superAdmin'
  )
);

-- Agregar columna para URL de grabación en training_sessions
ALTER TABLE public.training_sessions
ADD COLUMN IF NOT EXISTS recording_url TEXT;