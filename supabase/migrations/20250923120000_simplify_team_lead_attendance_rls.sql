-- Drop the existing policy
DROP POLICY IF EXISTS "Team Leads can view their direct reports' attendance" ON public.attendance;

-- Add the new, simplified policy
CREATE POLICY "Team Leads can view their direct reports' attendance"
ON public.attendance
FOR SELECT
USING (
  attendance.emp_id IN (
    SELECT e.emp_id
    FROM public.employees e
    WHERE e.reporting_manager_id = (
      SELECT tl.emp_id
      FROM public.employees tl
      JOIN public.roles r ON tl.role_id = r.role_id
      WHERE r.role_name = 'Team Lead' AND tl.user_id = auth.uid()
    )
  )
);