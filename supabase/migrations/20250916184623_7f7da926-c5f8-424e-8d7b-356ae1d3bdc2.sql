-- Remove existing policies for training_sessions
DROP POLICY IF EXISTS "Users can view their own sessions or elevated roles by account" ON public.training_sessions;
DROP POLICY IF EXISTS "Elevated roles can update sessions by account" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can insert their sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Delete sessions only superAdmin" ON public.training_sessions;

-- Create new policies with proper role-based access
-- Agents can only view their own sessions
CREATE POLICY "Agents can view only their own sessions" ON public.training_sessions
  FOR SELECT 
  USING (
    user_id = auth.uid() AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'agent'
  );

-- Elevated roles can view sessions from their assigned accounts
CREATE POLICY "Elevated roles can view sessions from assigned accounts" ON public.training_sessions
  FOR SELECT 
  USING (
    (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('superAdmin', 'admin', 'supervisor', 'qualityAnalyst', 'backOffice')
    )) AND (
      account_id IN (SELECT get_user_accounts()) OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
    )
  );

-- Users can insert their own sessions
CREATE POLICY "Users can insert their sessions" ON public.training_sessions
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Agents can only update their own sessions
CREATE POLICY "Agents can update only their own sessions" ON public.training_sessions
  FOR UPDATE 
  USING (
    user_id = auth.uid() AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'agent'
  )
  WITH CHECK (
    user_id = auth.uid() AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'agent'
  );

-- Elevated roles can update sessions from assigned accounts
CREATE POLICY "Elevated roles can update sessions from assigned accounts" ON public.training_sessions
  FOR UPDATE 
  USING (
    (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('superAdmin', 'admin', 'supervisor', 'qualityAnalyst', 'backOffice')
    )) AND (
      account_id IN (SELECT get_user_accounts()) OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
    )
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('superAdmin', 'admin', 'supervisor', 'qualityAnalyst', 'backOffice')
    )) AND (
      account_id IN (SELECT get_user_accounts()) OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
    )
  );

-- Only superAdmin can delete sessions
CREATE POLICY "Only superAdmin can delete sessions" ON public.training_sessions
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superAdmin'
    )
  );