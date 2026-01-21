-- Update RLS to support custom/elevated roles for scenario assignments

-- Replace overly restrictive role list with function-based check
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.scenario_assignments;
CREATE POLICY "elevated_can_manage_assignments"
ON public.scenario_assignments
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (has_elevated_role(auth.uid()) OR is_super_admin())
WITH CHECK (has_elevated_role(auth.uid()) OR is_super_admin());

-- Replace select policy that listed fixed roles
DROP POLICY IF EXISTS "allow select own assignments or all for elevated" ON public.scenario_assignments;
CREATE POLICY "select_own_or_elevated_assignments"
ON public.scenario_assignments
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR has_elevated_role(auth.uid()) 
  OR is_super_admin()
);
