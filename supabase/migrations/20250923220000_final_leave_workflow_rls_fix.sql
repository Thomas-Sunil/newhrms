-- Final RLS policies for leave_requests to ensure Employee -> Dept Head -> HR workflow

-- Drop all existing RLS policies on public.leave_requests to ensure a clean slate
DROP POLICY IF EXISTS "Employees can view their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can create their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Department heads can view their department's leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Department heads can update their department's leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "HR managers can view all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "HR managers can update all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Team Leads can view their team leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Team Leads can update their team leave requests" ON public.leave_requests;

-- Drop the existing CHECK constraint for the status column (if it exists and is different)
ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_status_check;

-- Add the new CHECK constraint for the status column (ensure it's correct)
ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_status_check
CHECK (status IN ('pending_dept_review', 'dept_approved', 'dept_rejected', 'approved', 'rejected'));

-- Update existing 'pending' statuses to 'pending_dept_review' (if any old ones remain)
UPDATE public.leave_requests
SET status = 'pending_dept_review'
WHERE status = 'pending';

-- Migrate any 'pending_tl_review' to 'pending_dept_review'
UPDATE public.leave_requests
SET status = 'pending_dept_review'
WHERE status = 'pending_tl_review';

-- Migrate any 'tl_approved' to 'dept_approved'
UPDATE public.leave_requests
SET status = 'dept_approved'
WHERE status = 'tl_approved';

-- Migrate any 'tl_rejected' to 'rejected'
UPDATE public.leave_requests
SET status = 'rejected'
WHERE status = 'tl_rejected';

-- Recreate RLS Policies for leave_requests (Employee, Department Head, HR)

-- Policy: Employees can view their own leave requests
CREATE POLICY "Employees can view their own leave requests"
ON public.leave_requests
FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.employees WHERE emp_id = leave_requests.emp_id));

-- Policy: Employees can create their own leave requests (corrected status)
CREATE POLICY "Employees can create their own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.employees WHERE emp_id = leave_requests.emp_id)
  AND status = 'pending_dept_review'
);

-- Policy: Department heads can view their department's leave requests (corrected)
CREATE POLICY "Department heads can view their department's leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() IN (
    SELECT e1.user_id
    FROM public.employees e1
    JOIN public.employees e2 ON e1.department_id = e2.department_id
    JOIN public.roles r ON e1.role_id = r.role_id -- Join roles to check role_name
    WHERE e2.emp_id = leave_requests.emp_id
    AND r.role_name = 'Department Head'
  )
  AND leave_requests.status IN ('pending_dept_review', 'dept_approved', 'approved', 'rejected')
);

-- Policy: Department heads can update their department's leave requests (corrected)
CREATE POLICY "Department heads can update their department's leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT e1.user_id
    FROM public.employees e1
    JOIN public.employees e2 ON e1.department_id = e2.department_id
    JOIN public.roles r ON e1.role_id = r.role_id -- Join roles to check role_name
    WHERE e2.emp_id = leave_requests.emp_id
    AND r.role_name = 'Department Head'
  )
  AND leave_requests.status = 'pending_dept_review' -- Only update if pending DH review
)
WITH CHECK (
  NEW.status IN ('dept_approved', 'dept_rejected')
);

-- Policy: HR managers can view all leave requests
CREATE POLICY "HR managers can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees
    WHERE role_id IN (SELECT role_id FROM public.roles WHERE role_name IN ('HR Manager', 'CXO'))
  )
);

-- Policy: HR managers can update all leave requests
CREATE POLICY "HR managers can update all leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees
    WHERE role_id IN (SELECT role_id FROM public.roles WHERE role_name IN ('HR Manager', 'CXO'))
  )
  AND leave_requests.status = 'dept_approved' -- Only update if approved by DH
)
WITH CHECK (
  NEW.status IN ('approved', 'rejected')
);