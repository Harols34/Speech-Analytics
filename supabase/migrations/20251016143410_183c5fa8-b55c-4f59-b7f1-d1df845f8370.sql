-- Secure upsert and analysis save for training_sessions to avoid RLS issues for non-superadmin roles
-- 1) Function to upsert a training session with SECURITY DEFINER, but enforcing auth.uid() = p_user_id
create or replace function public.save_training_session_secure(
  p_id uuid,
  p_scenario_id uuid,
  p_user_id uuid,
  p_user_name text,
  p_account_id uuid,
  p_type text,
  p_status text,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_duration_seconds integer,
  p_conversation jsonb,
  p_performance_score integer,
  p_ai_summary text,
  p_mensajes_generales integer,
  p_mensajes_ia integer,
  p_mensajes_usuario integer
)
returns public.training_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.training_sessions;
begin
  -- Seguridad: el usuario autenticado debe ser el dueño de la sesión
  if p_user_id <> auth.uid() then
    raise exception 'Usuario no autorizado para crear/actualizar esta sesión';
  end if;

  insert into public.training_sessions as ts (
    id, scenario_id, user_id, user_name, account_id, type, status,
    started_at, completed_at, duration_seconds, conversation,
    performance_score, ai_summary, mensajes_generales, mensajes_ia, mensajes_usuario
  ) values (
    coalesce(p_id, gen_random_uuid()), p_scenario_id, p_user_id, p_user_name, p_account_id, p_type, p_status,
    coalesce(p_started_at, now()), p_completed_at, p_duration_seconds, coalesce(p_conversation, '[]'::jsonb),
    p_performance_score, p_ai_summary, p_mensajes_generales, p_mensajes_ia, p_mensajes_usuario
  )
  on conflict (id)
  do update set
    scenario_id = excluded.scenario_id,
    user_id = excluded.user_id,
    user_name = excluded.user_name,
    account_id = excluded.account_id,
    type = excluded.type,
    status = excluded.status,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at,
    duration_seconds = excluded.duration_seconds,
    conversation = excluded.conversation,
    performance_score = excluded.performance_score,
    ai_summary = excluded.ai_summary,
    mensajes_generales = excluded.mensajes_generales,
    mensajes_ia = excluded.mensajes_ia,
    mensajes_usuario = excluded.mensajes_usuario,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- 2) Function to persist AI analysis safely for any allowed user
create or replace function public.save_training_analysis_secure(
  p_session_id uuid,
  p_performance_score integer,
  p_ai_summary text,
  p_insights text[],
  p_recommendations text[],
  p_ai_report jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Permitir a: dueño de la sesión, roles elevados o superadmin
  if not (
    exists (select 1 from public.training_sessions ts where ts.id = p_session_id and ts.user_id = auth.uid())
    or public.has_elevated_role(auth.uid())
    or public.is_super_admin()
  ) then
    raise exception 'No autorizado a guardar análisis para esta sesión';
  end if;

  update public.training_sessions
  set
    performance_score = coalesce(p_performance_score, performance_score),
    ai_summary = coalesce(p_ai_summary, ai_summary),
    insights = coalesce(p_insights, insights),
    recommendations = coalesce(p_recommendations, recommendations),
    ai_report = coalesce(p_ai_report, ai_report),
    updated_at = now()
  where id = p_session_id;
end;
$$;