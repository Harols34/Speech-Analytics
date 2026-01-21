-- Add ai_report JSONB to persist full analysis
ALTER TABLE public.training_sessions
ADD COLUMN IF NOT EXISTS ai_report jsonb;

-- Optional index for querying presence of reports
CREATE INDEX IF NOT EXISTS idx_training_sessions_ai_report ON public.training_sessions USING GIN(ai_report);
