
-- Habilitar la extensión pgvector para búsquedas vectoriales
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Añadir campos necesarios para vectorización a la tabla calls existente
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS content_embedding VECTOR(1536),
ADD COLUMN IF NOT EXISTS call_topic TEXT;

-- Crear índice para búsquedas vectoriales
CREATE INDEX IF NOT EXISTS calls_content_embedding_idx ON public.calls 
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 100);

-- Crear índice para búsquedas rápidas por tema
CREATE INDEX IF NOT EXISTS calls_topic_idx ON public.calls(call_topic);

-- Función para obtener estadísticas de temas de llamadas
CREATE OR REPLACE FUNCTION public.get_call_topics_statistics()
RETURNS TABLE (
  topic TEXT,
  count BIGINT,
  percentage NUMERIC,
  call_ids BIGINT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_calls BIGINT;
BEGIN
  -- Obtener el total de llamadas
  SELECT COUNT(*) INTO total_calls FROM public.calls;
  
  -- Devolver estadísticas por tema incluyendo IDs de las llamadas
  RETURN QUERY
  SELECT 
    COALESCE(c.call_topic, 'Sin categorizar') as topic,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / NULLIF(total_calls, 0)), 2) as percentage,
    array_agg(c.id::BIGINT) as call_ids
  FROM 
    public.calls c
  GROUP BY 
    c.call_topic
  ORDER BY 
    count DESC;
END;
$$;

-- Función para buscar llamadas por similitud vectorial
CREATE OR REPLACE FUNCTION public.match_calls(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title TEXT,
  agent_name TEXT,
  call_date TIMESTAMP WITH TIME ZONE,
  call_topic TEXT,
  summary TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    calls.id,
    calls.title,
    calls.agent_name,
    calls.date as call_date,
    calls.call_topic,
    calls.summary,
    1 - (calls.content_embedding <=> query_embedding) AS similarity
  FROM public.calls
  WHERE 
    calls.content_embedding IS NOT NULL AND
    1 - (calls.content_embedding <=> query_embedding) > match_threshold
  ORDER BY calls.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Función para analizar temas de llamadas basado en resúmenes y transcripciones
CREATE OR REPLACE FUNCTION public.analyze_call_topics_from_content()
RETURNS TABLE (
  topic TEXT,
  count BIGINT,
  percentage NUMERIC,
  call_titles TEXT[],
  call_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_calls BIGINT;
BEGIN
  -- Obtener el total de llamadas con contenido
  SELECT COUNT(*) INTO total_calls 
  FROM public.calls 
  WHERE summary IS NOT NULL OR transcription IS NOT NULL;
  
  -- Análisis simple basado en palabras clave en resúmenes
  RETURN QUERY
  WITH topic_analysis AS (
    SELECT 
      c.id,
      c.title,
      CASE 
        WHEN (c.summary ILIKE '%activación%' OR c.summary ILIKE '%activar%' OR c.summary ILIKE '%línea%') THEN 'Activación de líneas'
        WHEN (c.summary ILIKE '%precio%' OR c.summary ILIKE '%costo%' OR c.summary ILIKE '%tarifa%' OR c.summary ILIKE '%plan%') THEN 'Consultas sobre precios'
        WHEN (c.summary ILIKE '%seguimiento%' OR c.summary ILIKE '%anterior%' OR c.summary ILIKE '%previo%') THEN 'Seguimiento de casos anteriores'
        WHEN (c.summary ILIKE '%soporte%' OR c.summary ILIKE '%problema%' OR c.summary ILIKE '%falla%') THEN 'Soporte técnico'
        WHEN (c.summary ILIKE '%factura%' OR c.summary ILIKE '%pago%' OR c.summary ILIKE '%cobro%') THEN 'Consultas de facturación'
        ELSE 'Otros temas'
      END as detected_topic
    FROM public.calls c
    WHERE c.summary IS NOT NULL
  )
  SELECT 
    ta.detected_topic as topic,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / NULLIF(total_calls, 0)), 2) as percentage,
    array_agg(ta.title) as call_titles,
    array_agg(ta.id) as call_ids
  FROM topic_analysis ta
  GROUP BY ta.detected_topic
  ORDER BY count DESC;
END;
$$;
