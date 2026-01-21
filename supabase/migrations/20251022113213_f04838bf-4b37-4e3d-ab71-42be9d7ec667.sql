-- Ensure training_scenarios has dynamic evaluation and knowledge columns
ALTER TABLE IF EXISTS public.training_scenarios
  ADD COLUMN IF NOT EXISTS evaluation_criteria JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_base TEXT,
  ADD COLUMN IF NOT EXISTS custom_evaluation_instructions TEXT,
  ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
  ADD COLUMN IF NOT EXISTS call_completion_rules JSONB;

-- Ensure training_sessions has recording_url and duration
ALTER TABLE IF EXISTS public.training_sessions
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Create private storage bucket for training recordings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'training-recordings'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('training-recordings', 'training-recordings', false);
  END IF;
END $$;

-- Create policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can read their own training recordings'
  ) THEN
    CREATE POLICY "Users can read their own training recordings"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'training-recordings'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can upload their own training recordings'
  ) THEN
    CREATE POLICY "Users can upload their own training recordings"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'training-recordings'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can update their own training recordings'
  ) THEN
    CREATE POLICY "Users can update their own training recordings"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'training-recordings'
      AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'training-recordings'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete their own training recordings'
  ) THEN
    CREATE POLICY "Users can delete their own training recordings"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'training-recordings'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Function to safely update session recording URL
CREATE OR REPLACE FUNCTION public.update_training_session_recording(
  p_session_id UUID,
  p_recording_url TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only allow the session owner to update their recording
  UPDATE public.training_sessions
  SET recording_url = p_recording_url
  WHERE id = p_session_id
    AND user_id = auth.uid();
END;
$$;