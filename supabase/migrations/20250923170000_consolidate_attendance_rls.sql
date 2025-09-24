-- Consolidate RLS policies for public.attendance

-- Drop all existing SELECT policies on public.attendance to ensure a clean slate
DROP POLICY IF EXISTS "Employees can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Dept heads can view department attendance" ON public.attendance;
DROP POLICY IF EXISTS "HR can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Team Leads can view their direct reports' attendance" ON public.attendance;

-- Policy 1: Employees can view their own attendance
CREATE POLICY "Employees can view own attendance"
ON public.attendance
FOR SELECT
USING (
  auth.uid() IN (
    SELECT e.user_id FROM public.employees e WHERE e.emp_id = attendance.emp_id
  )
);

-- Policy 2: Department Heads can view attendance of employees in their department
CREATE POLICY "Dept heads can view department attendance"
ON public.attendance
FOR SELECT
USING (
  auth.uid() IN (
    SELECT e1.user_id
    FROM public.employees e1
    JOIN public.employees e2 ON e1.department_id = e2.department_id
    WHERE e2.emp_id = attendance.emp_id
      AND e1.role_id IN (
        SELECT r.role_id FROM public.roles r WHERE r.role_name = 'Department Head'
      )
  )
);

-- Policy 3: HR and CXO can view all attendance
CREATE POLICY "HR can view all attendance"
ON public.attendance
FOR SELECT
USING (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.role_id
    WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);

-- Policy 4: Team Leads can view their direct reports' attendance
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