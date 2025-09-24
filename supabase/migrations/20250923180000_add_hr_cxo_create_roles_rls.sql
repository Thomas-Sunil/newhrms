-- Add RLS policy to allow HR and CXO to create new roles
DROP POLICY IF EXISTS "HR and CXO can create roles" ON public.roles;

CREATE POLICY "HR and CXO can create roles"
ON public.roles
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.role_id
    WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);