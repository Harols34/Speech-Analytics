-- Fix database function security by adding proper search_path settings
-- Update existing SECURITY DEFINER functions to include proper search_path

-- Update functions that need search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_prompt_activation() SET search_path = public;
ALTER FUNCTION public.check_call_chat_limit_before_insert() SET search_path = public;
ALTER FUNCTION public.check_chat_limit_before_insert() SET search_path = public;
ALTER FUNCTION public.check_transcription_limit_before_insert() SET search_path = public;
ALTER FUNCTION public.update_account_limits_updated_at() SET search_path = public;
ALTER FUNCTION public.update_accounts_updated_at() SET search_path = public;
ALTER FUNCTION public.update_prompts_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.get_user_accounts() SET search_path = public;
ALTER FUNCTION public.is_super_admin() SET search_path = public;
ALTER FUNCTION public.is_super_admin_user() SET search_path = public;
ALTER FUNCTION public.count_calls_by_account(uuid) SET search_path = public;
ALTER FUNCTION public.ensure_account_folder(uuid) SET search_path = public;
ALTER FUNCTION public.ensure_audio_account_folder(uuid) SET search_path = public;
ALTER FUNCTION public.delete_multiple_calls(uuid[]) SET search_path = public;
ALTER FUNCTION public.delete_call_with_messages(uuid) SET search_path = public;
ALTER FUNCTION public.ampliar_horas_adicionales(uuid, integer) SET search_path = public;
ALTER FUNCTION public.can_transcribe_for_account(uuid) SET search_path = public;
ALTER FUNCTION public.can_chat_for_account(uuid, text) SET search_path = public;
ALTER FUNCTION public.check_account_limits(uuid, text) SET search_path = public;
ALTER FUNCTION public.check_account_limits_v2(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.clean_platform() SET search_path = public;
ALTER FUNCTION public.crear_comportamiento(text, text, text, boolean) SET search_path = public;
ALTER FUNCTION public.get_account_detailed_metrics(uuid, date, date) SET search_path = public;
ALTER FUNCTION public.get_call_topics_statistics() SET search_path = public;
ALTER FUNCTION public.get_real_time_usage(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.match_calls(vector, double precision, integer) SET search_path = public;
ALTER FUNCTION public.register_usage(uuid, text, numeric, uuid, numeric) SET search_path = public;
ALTER FUNCTION public.register_usage_v2(uuid, text, numeric, uuid, numeric, integer, text, text) SET search_path = public;
ALTER FUNCTION public.analyze_call_topics_from_content() SET search_path = public;