-- Drop the existing policy
DROP POLICY IF EXISTS "Team Leads can view their direct reports' attendance" ON public.attendance;

-- Add the new, explicit policy
CREATE POLICY "Team Leads can view their direct reports' attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.employees AS direct_report
    JOIN public.employees AS team_lead_employee
      ON direct_report.reporting_manager_id = team_lead_employee.emp_id
    JOIN public.roles AS team_lead_role
      ON team_lead_employee.role_id = team_lead_role.role_id
    WHERE
      attendance.emp_id = direct_report.emp_id
      AND team_lead_role.role_name = 'Team Lead'
      AND team_lead_employee.user_id = auth.uid()
  )
);