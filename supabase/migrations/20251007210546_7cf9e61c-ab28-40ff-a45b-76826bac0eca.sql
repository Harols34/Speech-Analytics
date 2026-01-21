CREATE OR REPLACE FUNCTION public.get_users_for_account(p_account_id uuid)
RETURNS TABLE(id uuid, full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Permitir a todos los roles excepto 'agent' (y superAdmin implícitamente)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role <> 'agent'
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.role
  FROM public.user_accounts ua
  JOIN public.profiles p ON p.id = ua.user_id
  WHERE ua.account_id = p_account_id
    AND p.role <> 'superAdmin'
  ORDER BY p.full_name;
END;
$$;