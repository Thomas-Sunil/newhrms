-- Add ON DELETE CASCADE to emp_id foreign key in public.leave_requests

-- Drop the existing foreign key constraint
ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_emp_id_fkey;

-- Add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_emp_id_fkey
FOREIGN KEY (emp_id)
REFERENCES public.employees(emp_id) ON DELETE CASCADE;