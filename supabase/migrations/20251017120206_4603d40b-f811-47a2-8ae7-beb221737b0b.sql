-- Problema: La columna scenario_id no acepta NULL pero la FK está configurada con SET NULL
-- Solución: Hacer la columna scenario_id nullable para permitir que las sesiones persistan sin escenario

-- Permitir valores NULL en scenario_id
ALTER TABLE public.training_sessions 
ALTER COLUMN scenario_id DROP NOT NULL;

-- Agregar índice para mejorar rendimiento en consultas de sesiones sin escenario
CREATE INDEX IF NOT EXISTS idx_training_sessions_scenario_id_null 
ON public.training_sessions(id) 
WHERE scenario_id IS NULL;

-- Comentario explicativo
COMMENT ON COLUMN public.training_sessions.scenario_id IS 
'ID del escenario de entrenamiento. Puede ser NULL si el escenario fue eliminado, preservando el historial de la sesión.';
