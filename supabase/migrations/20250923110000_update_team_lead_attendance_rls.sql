-- Drop the existing policy
DROP POLICY IF EXISTS "Team Leads can view their direct reports' attendance" ON public.attendance;

-- Add the new, more robust policy
CREATE POLICY "Team Leads can view their direct reports' attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.employees AS tl_employee
    JOIN public.roles AS tl_role ON tl_employee.role_id = tl_role.role_id
    WHERE tl_role.role_name = 'Team Lead'
      AND tl_employee.user_id = auth.uid()
      AND attendance.emp_id IN (
        SELECT direct_report.emp_id
        FROM public.employees AS direct_report
        WHERE direct_report.reporting_manager_id = tl_employee.emp_id
      )
  )
);