
-- Crear el bucket call-recordings si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('call-recordings', 'Call Recordings', true, 104857600, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'])
ON CONFLICT (id) DO NOTHING;
