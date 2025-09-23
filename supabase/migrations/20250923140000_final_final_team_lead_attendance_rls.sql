-- Drop the existing policy
DROP POLICY IF EXISTS "Team Leads can view their direct reports' attendance" ON public.attendance;

-- Add the new, most direct policy
CREATE POLICY "Team Leads can view their direct reports' attendance"
ON public.attendance
FOR SELECT
USING (
  (SELECT reporting_manager_id FROM public.employees WHERE emp_id = attendance.emp_id) = (
    SELECT emp_id
    FROM public.employees
    WHERE user_id = auth.uid()
      AND role_id = (SELECT role_id FROM public.roles WHERE role_name = 'Team Lead')
  )
);