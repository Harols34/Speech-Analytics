
-- Políticas RLS para chat_messages (chat global)
CREATE POLICY "Users can view chat messages from their accounts" ON public.chat_messages
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert their own chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat messages" ON public.chat_messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat messages" ON public.chat_messages
  FOR DELETE USING (user_id = auth.uid());

-- Políticas RLS para call_chat_messages (chat específico de llamadas)
CREATE POLICY "Users can view call chat messages from accessible calls" ON public.call_chat_messages
  FOR SELECT USING (
    call_id IN (
      SELECT c.id FROM public.calls c
      JOIN public.user_accounts ua ON c.account_id = ua.account_id
      WHERE ua.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert call chat messages for accessible calls" ON public.call_chat_messages
  FOR INSERT WITH CHECK (
    call_id IN (
      SELECT c.id FROM public.calls c
      JOIN public.user_accounts ua ON c.account_id = ua.account_id
      WHERE ua.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own call chat messages" ON public.call_chat_messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own call chat messages" ON public.call_chat_messages
  FOR DELETE USING (user_id = auth.uid());
