-- Create edge function save-training-session (no DB changes needed for tables)
-- But we will ensure BackOffice role exists in profiles table usage (no enum constraint so no change needed)
-- Adjust RLS: Restrict DELETE on training_sessions and training_messages to only superAdmin; allow SELECT for roles supervisor, qualityAnalyst, admin, backOffice across all accounts

-- First, drop overly permissive policies on training_sessions and training_messages and recreate with precise rules

-- training_sessions
DROP POLICY IF EXISTS "Users can manage own sessions or from assigned accounts" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can view own sessions or from assigned accounts" ON public.training_sessions;

-- Allow SELECT:
CREATE POLICY "View own or assigned sessions; elevated roles view all"
ON public.training_sessions
FOR SELECT
USING (
  user_id = auth.uid()
  OR (account_id IN (SELECT get_user_accounts()))
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('superAdmin','admin','supervisor','qualityAnalyst','backOffice'))
);

-- Allow INSERT only by owner or assigned account
CREATE POLICY "Insert own or assigned sessions"
ON public.training_sessions
FOR INSERT
WITH CHECK (
  (user_id = auth.uid())
  OR (account_id IN (SELECT get_user_accounts()))
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin')
);

-- Allow UPDATE only by owner or superAdmin
CREATE POLICY "Update own sessions or superAdmin"
ON public.training_sessions
FOR UPDATE
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin'))
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin'));

-- Allow DELETE only by superAdmin
CREATE POLICY "Delete sessions only superAdmin"
ON public.training_sessions
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin'));

-- training_messages
DROP POLICY IF EXISTS "Users can manage messages from accessible sessions" ON public.training_messages;
DROP POLICY IF EXISTS "Users can view messages from accessible sessions" ON public.training_messages;

-- SELECT messages: own session, assigned accounts, or elevated roles
CREATE POLICY "View messages with elevated roles"
ON public.training_messages
FOR SELECT
USING (
  session_id IN (
    SELECT ts.id FROM public.training_sessions ts
    WHERE ts.user_id = auth.uid()
       OR ts.account_id IN (SELECT get_user_accounts())
       OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('superAdmin','admin','supervisor','qualityAnalyst','backOffice'))
  )
);

-- INSERT messages: only for sessions owned by user or assigned accounts, or superAdmin
CREATE POLICY "Insert messages for own or assigned sessions"
ON public.training_messages
FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT ts.id FROM public.training_sessions ts
    WHERE ts.user_id = auth.uid()
       OR ts.account_id IN (SELECT get_user_accounts())
       OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin')
  )
);

-- UPDATE messages: only by owner or superAdmin
CREATE POLICY "Update messages own or superAdmin"
ON public.training_messages
FOR UPDATE
USING (
  session_id IN (
    SELECT ts.id FROM public.training_sessions ts WHERE ts.user_id = auth.uid()
  ) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin')
)
WITH CHECK (
  session_id IN (
    SELECT ts.id FROM public.training_sessions ts WHERE ts.user_id = auth.uid()
  ) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin')
);

-- DELETE messages: only superAdmin
CREATE POLICY "Delete messages only superAdmin"
ON public.training_messages
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superAdmin'));
