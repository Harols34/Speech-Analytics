-- Problema: Al eliminar escenarios se borran las conversaciones (training_sessions)
-- Solución: Cambiar foreign key de CASCADE a SET NULL para mantener historial

-- 1. Eliminar la foreign key actual con CASCADE
ALTER TABLE public.training_sessions
DROP CONSTRAINT IF EXISTS training_sessions_scenario_id_fkey;

-- 2. Asegurar que scenario_id pueda ser NULL (ya lo es según el esquema)
-- La columna ya es nullable, así que no necesitamos modificarla

-- 3. Crear nueva foreign key con ON DELETE SET NULL
-- Esto permite que las sesiones de entrenamiento se conserven aunque se elimine el escenario
ALTER TABLE public.training_sessions
ADD CONSTRAINT training_sessions_scenario_id_fkey 
FOREIGN KEY (scenario_id) 
REFERENCES public.training_scenarios(id) 
ON DELETE SET NULL;

-- Comentario explicativo
COMMENT ON CONSTRAINT training_sessions_scenario_id_fkey ON public.training_sessions IS 
'Foreign key con SET NULL: al eliminar un escenario, las sesiones se mantienen con scenario_id = NULL para preservar el historial';
