
-- Crear un nuevo bucket para grabaciones de audio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audio-recordings', 'Audio Recordings', true, 104857600, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'])
ON CONFLICT (id) DO NOTHING;

-- Crear una función para asegurar que las carpetas de cuenta existan en el nuevo bucket
CREATE OR REPLACE FUNCTION public.ensure_audio_account_folder(account_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Crear un archivo .keep para asegurar que la carpeta existe
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('audio-recordings', account_uuid::text || '/.keep', auth.uid(), '{}')
  ON CONFLICT (bucket_id, name) DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$function$;
