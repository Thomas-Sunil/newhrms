-- Add new columns for Team Lead review
ALTER TABLE public.leave_requests
ADD COLUMN team_lead_comments TEXT,
ADD COLUMN reviewed_by_team_lead UUID REFERENCES public.employees(emp_id),
ADD COLUMN tl_review_date TIMESTAMP WITH TIME ZONE;

-- Update the CHECK constraint for the status column
ALTER TABLE public.leave_requests
DROP CONSTRAINT leave_requests_status_check;

ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_status_check
CHECK (status IN ('pending_tl_review', 'tl_approved', 'tl_rejected', 'dept_approved', 'dept_rejected', 'approved', 'rejected'));

-- Update existing 'pending' statuses to 'pending_tl_review'
UPDATE public.leave_requests
SET status = 'pending_tl_review'
WHERE status = 'pending';

-- Add RLS policies for Team Leads
-- Team Leads can view leave requests of their direct reports
CREATE POLICY "Team Leads can view their direct reports' leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    WHERE e.emp_id = leave_requests.emp_id
    AND e.reporting_manager_id IN (
      SELECT tl.emp_id FROM public.employees tl WHERE tl.user_id = auth.uid() AND tl.role_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Team Lead')
    )
  )
);

-- Team Leads can update leave requests of their direct reports (only if status is 'pending_tl_review')
CREATE POLICY "Team Leads can update their direct reports' leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    WHERE e.emp_id = leave_requests.emp_id
    AND e.reporting_manager_id IN (
      SELECT tl.emp_id FROM public.employees tl WHERE tl.user_id = auth.uid() AND tl.role_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Team Lead')
    )
  )
  AND leave_requests.status = 'pending_tl_review'
)
WITH CHECK (
  -- Ensure TL can only change status to 'tl_approved' or 'tl_rejected'
  NEW.status IN ('tl_approved', 'tl_rejected')
);

-- Update existing RLS policies for Department Heads and HR to reflect new workflow
-- Department heads can view their department's leave requests (now also including 'tl_approved')
DROP POLICY "Department heads can view their department's leave requests" ON public.leave_requests;
CREATE POLICY "Department heads can view their department's leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() IN (
    SELECT e1.user_id
    FROM public.employees e1
    JOIN public.employees e2 ON e1.department_id = e2.department_id
    WHERE e2.emp_id = leave_requests.emp_id
    AND e1.role_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Department Head')
  )
  AND leave_requests.status IN ('tl_approved', 'dept_approved', 'approved', 'rejected') -- Can see after TL approval
);

-- Department heads can update their department's leave requests (only if status is 'tl_approved')
DROP POLICY "Department heads can update their department's leave requests" ON public.leave_requests;
CREATE POLICY "Department heads can update their department's leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT e1.user_id
    FROM public.employees e1
    JOIN public.employees e2 ON e1.department_id = e2.department_id
    WHERE e2.emp_id = leave_requests.emp_id
    AND e1.role_id IN (SELECT role_id FROM public.roles WHERE role_name = 'Department Head')
  )
  AND leave_requests.status = 'tl_approved'
)
WITH CHECK (
  -- Ensure Dept Head can only change status to 'dept_approved' or 'dept_rejected'
  NEW.status IN ('dept_approved', 'dept_rejected')
);

-- HR managers can view all leave requests (now including all new statuses)
DROP POLICY "HR managers can view all leave requests" ON public.leave_requests;
CREATE POLICY "HR managers can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees
    WHERE role_id IN (SELECT role_id FROM public.roles WHERE role_name IN ('HR Manager', 'CXO'))
  )
);

-- HR managers can update all leave requests (only if status is 'dept_approved')
DROP POLICY "HR managers can update all leave requests" ON public.leave_requests;
CREATE POLICY "HR managers can update all leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees
    WHERE role_id IN (SELECT role_id FROM public.roles WHERE role_name IN ('HR Manager', 'CXO'))
  )
  AND leave_requests.status = 'dept_approved'
)
WITH CHECK (
  -- Ensure HR can only change status to 'approved' or 'rejected'
  NEW.status IN ('approved', 'rejected')
);