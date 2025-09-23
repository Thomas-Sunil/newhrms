-- Create leave_requests table for managing employee leave applications
CREATE TABLE public.leave_requests (
  leave_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emp_id UUID NOT NULL REFERENCES public.employees(emp_id),
  leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'vacation', 'personal', 'emergency')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dept_approved', 'approved', 'rejected')),
  dept_head_comments TEXT,
  hr_comments TEXT,
  reviewed_by_dept_head UUID REFERENCES public.employees(emp_id),
  reviewed_by_hr UUID REFERENCES public.employees(emp_id),
  dept_review_date TIMESTAMP WITH TIME ZONE,
  hr_review_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on leave_requests
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_requests
CREATE POLICY "Employees can view their own leave requests" 
ON public.leave_requests 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.employees WHERE emp_id = leave_requests.emp_id));

CREATE POLICY "Employees can create their own leave requests" 
ON public.leave_requests 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.employees WHERE emp_id = leave_requests.emp_id));

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
);

CREATE POLICY "HR managers can view all leave requests" 
ON public.leave_requests 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees 
    WHERE role_id IN (SELECT role_id FROM public.roles WHERE role_name IN ('HR Manager', 'CXO'))
  )
);

CREATE POLICY "HR managers can update all leave requests" 
ON public.leave_requests 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees 
    WHERE role_id IN (SELECT role_id FROM public.roles WHERE role_name IN ('HR Manager', 'CXO'))
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();