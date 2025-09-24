-- Remove Team Lead from leave workflow and route directly to Department Head

-- 1. Drop RLS policies related to Team Leads for leave_requests
DROP POLICY IF EXISTS "Team Leads can view their direct reports' leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Team Leads can update their direct reports' leave requests" ON public.leave_requests;

-- 2. Update the CHECK constraint for the status column
ALTER TABLE public.leave_requests
DROP CONSTRAINT leave_requests_status_check;

ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_status_check
CHECK (status IN ('pending_dept_review', 'dept_approved', 'dept_rejected', 'approved', 'rejected'));

-- 3. Update existing leave_requests data to reflect the new workflow
-- Migrate 'pending_tl_review' to 'pending_dept_review'
UPDATE public.leave_requests
SET status = 'pending_dept_review'
WHERE status = 'pending_tl_review';

-- Migrate 'tl_approved' to 'dept_approved'
UPDATE public.leave_requests
SET status = 'dept_approved'
WHERE status = 'tl_approved';

-- Migrate 'tl_rejected' to 'rejected' (or 'dept_rejected' if a DH rejected it)
-- For simplicity, we'll move tl_rejected to rejected, assuming DH will re-evaluate if needed.
UPDATE public.leave_requests
SET status = 'rejected'
WHERE status = 'tl_rejected';

-- 4. Adjust Department Head RLS policies
-- Department heads can view their department's leave requests (now including 'pending_dept_review')
DROP POLICY IF EXISTS "Department heads can view their department's leave requests" ON public.leave_requests;
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
  AND leave_requests.status IN ('pending_dept_review', 'dept_approved', 'approved', 'rejected')
);

-- Department heads can update their department's leave requests (only if status is 'pending_dept_review')
DROP POLICY IF EXISTS "Department heads can update their department's leave requests" ON public.leave_requests;
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
  AND leave_requests.status = 'pending_dept_review'
)
WITH CHECK (
  NEW.status IN ('dept_approved', 'dept_rejected')
);

-- 5. Adjust HR RLS policies (ensure consistency)
-- HR managers can view all leave requests
DROP POLICY IF EXISTS "HR managers can view all leave requests" ON public.leave_requests;
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
DROP POLICY IF EXISTS "HR managers can update all leave requests" ON public.leave_requests;
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
  NEW.status IN ('approved', 'rejected')
);