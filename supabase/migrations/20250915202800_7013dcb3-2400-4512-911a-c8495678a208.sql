-- Add backOffice to existing RLS policies that reference qualityAnalyst
-- Update training_plans policies
DROP POLICY IF EXISTS "Solo administradores y supervisores pueden crear planes" ON public.training_plans;
CREATE POLICY "Solo administradores y supervisores pueden crear planes" 
ON public.training_plans 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'supervisor', 'qualityAnalyst', 'backOffice')
  )
);

-- Update training_reports policies  
DROP POLICY IF EXISTS "Solo administradores y supervisores pueden crear reportes" ON public.training_reports;
CREATE POLICY "Solo administradores y supervisores pueden crear reportes" 
ON public.training_reports 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'supervisor', 'qualityAnalyst', 'backOffice')
  )
);

-- Update behaviors policies
DROP POLICY IF EXISTS "Admins and QA can manage behaviors" ON public.behaviors;
CREATE POLICY "Admins and QA can manage behaviors" 
ON public.behaviors 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('superAdmin', 'admin', 'qualityAnalyst', 'backOffice')
  )
);

-- Update training_sessions view policy
DROP POLICY IF EXISTS "View own or assigned sessions; elevated roles view all" ON public.training_sessions;
CREATE POLICY "View own or assigned sessions; elevated roles view all" 
ON public.training_sessions 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR 
  (account_id IN (SELECT get_user_accounts())) OR 
  (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('superAdmin', 'admin', 'supervisor', 'qualityAnalyst', 'backOffice')
  ))
);

-- Update training_messages view policy
DROP POLICY IF EXISTS "View messages with elevated roles" ON public.training_messages;
CREATE POLICY "View messages with elevated roles" 
ON public.training_messages 
FOR SELECT 
USING (
  session_id IN (
    SELECT ts.id FROM training_sessions ts 
    WHERE (ts.user_id = auth.uid()) OR 
          (ts.account_id IN (SELECT get_user_accounts())) OR 
          (EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('superAdmin', 'admin', 'supervisor', 'qualityAnalyst', 'backOffice')
          ))
  )
);