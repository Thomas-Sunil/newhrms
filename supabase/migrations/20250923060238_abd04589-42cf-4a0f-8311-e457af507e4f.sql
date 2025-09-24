CREATE POLICY "Employees can view their own leave requests"
ON public.leave_requests
FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.employees WHERE emp_id = leave_requests.emp_id));

-- Employees can create their own leave requests
CREATE POLICY "Employees can create their own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.employees WHERE emp_id = leave_requests.emp_id)
  AND status = 'pending_tl_review'
);

-- Team Leads can view leave requests of their direct reports
CREATE POLICY "Team Leads can view their team leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() IN (
    SELECT e1.user_id
    FROM public.employees e1
    JOIN public.employees e2 ON e1.team_id = e2.team_id
    WHERE e2.emp_id = leave_requests.emp_id
    AND e1.roles_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Team Lead')
  )
);

-- Team Leads can update requests from pending_tl_review → tl_approved/rejected
CREATE POLICY "Team Leads can update their team leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT e1.user_id
    FROM public.employees e1
    JOIN public.employees e2 ON e1.team_id = e2.team_id
    WHERE e2.emp_id = leave_requests.emp_id
    AND e1.roles_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Team Lead')
  )
)
WITH CHECK (status IN ('tl_approved','rejected'));

-- Department Heads can view their department's leave requests
CREATE POLICY "Department heads can view their department's leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() IN (
    SELECT e1.user_id
    FROM public.employees e1
    JOIN public.employees e2 ON e1.department_id = e2.department_id
    WHERE e2.emp_id = leave_requests.emp_id
    AND e1.roles_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Department Head')
  )
);

-- Department Heads can update from tl_approved → dept_approved/rejected
CREATE POLICY "Department heads can update their department's leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT e1.user_id
    FROM public.employees e1
    JOIN public.employees e2 ON e1.department_id = e2.department_id
    WHERE e2.emp_id = leave_requests.emp_id
    AND e1.roles_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Department Head')
  )
)
WITH CHECK (status IN ('dept_approved','rejected'));

-- HR Managers & CXOs can view all requests
CREATE POLICY "HR managers can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees
    WHERE role_id IN (SELECT role_id FROM public.roles WHERE role_name IN ('HR Manager','CXO'))
  )
);

-- HR Managers & CXOs can update dept_approved → approved/rejected
CREATE POLICY "HR managers can update all leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees
    WHERE role_id IN (SELECT role_id FROM public.roles WHERE role_name IN ('HR Manager','CXO'))
  )
)
WITH CHECK (status IN ('approved','rejected'));

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();