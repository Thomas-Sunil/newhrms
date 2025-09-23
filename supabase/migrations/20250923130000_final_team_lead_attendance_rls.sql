-- Drop the existing policy
DROP POLICY IF EXISTS "Team Leads can view their direct reports' attendance" ON public.attendance;

-- Add the new, simplified policy
CREATE POLICY "Team Leads can view their direct reports' attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.employees AS direct_report
    WHERE direct_report.emp_id = attendance.emp_id
      AND direct_report.reporting_manager_id = (
        SELECT emp_id
        FROM public.employees
        WHERE user_id = auth.uid()
          AND role_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Team Lead')
      )
  )
);