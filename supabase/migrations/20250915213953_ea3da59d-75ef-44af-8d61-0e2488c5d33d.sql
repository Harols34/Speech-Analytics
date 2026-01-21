-- Add user_name to training_sessions to store the agent's display name
ALTER TABLE public.training_sessions
ADD COLUMN IF NOT EXISTS user_name text;

-- Optional: ensure ai_report column exists (safety)
ALTER TABLE public.training_sessions
ADD COLUMN IF NOT EXISTS ai_report jsonb;
