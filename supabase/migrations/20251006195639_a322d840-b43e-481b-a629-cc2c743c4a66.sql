-- Agregar nuevos campos para calificación dinámica de escenarios
ALTER TABLE public.training_scenarios
ADD COLUMN IF NOT EXISTS evaluation_criteria jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS knowledge_base text,
ADD COLUMN IF NOT EXISTS custom_evaluation_instructions text,
ADD COLUMN IF NOT EXISTS expected_outcome text,
ADD COLUMN IF NOT EXISTS call_completion_rules jsonb DEFAULT '{"success_message": "¡Excelente trabajo! Has completado el escenario exitosamente.", "failure_message": "El escenario ha finalizado. Revisa tu calificación para identificar áreas de mejora.", "auto_close_on_failure": true}'::jsonb;

-- Comentarios descriptivos
COMMENT ON COLUMN public.training_scenarios.evaluation_criteria IS 'Array de criterios de evaluación dinámicos con nombre, descripción y peso';
COMMENT ON COLUMN public.training_scenarios.knowledge_base IS 'Base de conocimiento contextual para validar respuestas (precios, planes, políticas, etc)';
COMMENT ON COLUMN public.training_scenarios.custom_evaluation_instructions IS 'Instrucciones personalizadas para el evaluador IA sobre qué evaluar';
COMMENT ON COLUMN public.training_scenarios.expected_outcome IS 'Resultado esperado del cliente en el escenario (comportamiento ideal)';
COMMENT ON COLUMN public.training_scenarios.call_completion_rules IS 'Reglas para finalizar la llamada (mensajes de éxito/fallo, cierre automático)';