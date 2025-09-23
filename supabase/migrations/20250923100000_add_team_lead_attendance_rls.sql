-- Add RLS policy for Team Leads to view their direct reports' attendance
CREATE POLICY "Team Leads can view their direct reports' attendance"
ON public.attendance
FOR SELECT
USING (
  auth.uid() IN (
    SELECT tl.user_id
    FROM public.employees tl
    WHERE tl.role_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Team Lead')
    AND attendance.emp_id IN (
      SELECT e.emp_id FROM public.employees e WHERE e.reporting_manager_id = tl.emp_id
    )
  )
);