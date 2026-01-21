-- Create secure RPC to list users assigned to a given account for elevated roles
CREATE OR REPLACE FUNCTION public.get_users_for_account(p_account_id uuid)
RETURNS TABLE(id uuid, full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Permitir solo a roles elevados o superAdmin
  IF NOT (public.has_elevated_role(auth.uid()) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.role
  FROM public.user_accounts ua
  JOIN public.profiles p ON p.id = ua.user_id
  WHERE ua.account_id = p_account_id
  ORDER BY p.full_name;
END;
$$;