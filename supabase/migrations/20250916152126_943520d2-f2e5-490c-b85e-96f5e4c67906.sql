-- Crear tabla para asignaciones obligatorias de escenarios
CREATE TABLE public.scenario_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.training_scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  account_id UUID,
  UNIQUE(scenario_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.scenario_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their assignments"
  ON public.scenario_assignments
  FOR SELECT
  USING (user_id = auth.uid() OR account_id IN (SELECT get_user_accounts()));

CREATE POLICY "Admins can manage assignments"
  ON public.scenario_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('superAdmin', 'admin', 'supervisor', 'qualityAnalyst', 'backOffice')
    )
  );

-- Función para obtener estadísticas de escenarios
CREATE OR REPLACE FUNCTION public.get_scenario_stats(scenario_uuid UUID)
RETURNS TABLE(
  total_sessions BIGINT,
  avg_score NUMERIC,
  avg_duration_minutes NUMERIC,
  assigned_count BIGINT,
  completed_assignments BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(ts.id), 0) as total_sessions,
    COALESCE(AVG(ts.performance_score), 0) as avg_score,
    COALESCE(AVG(ts.duration_seconds / 60.0), 0) as avg_duration_minutes,
    COALESCE((SELECT COUNT(*) FROM scenario_assignments sa WHERE sa.scenario_id = scenario_uuid), 0) as assigned_count,
    COALESCE((SELECT COUNT(*) FROM scenario_assignments sa WHERE sa.scenario_id = scenario_uuid AND sa.status = 'completed'), 0) as completed_assignments
  FROM training_sessions ts
  WHERE ts.scenario_id = scenario_uuid
  AND ts.status = 'completed';
END;
$$;