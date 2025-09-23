-- Phase 1: Core HR Schema Enhancement

-- 1. Add reporting_manager_id to employees table
ALTER TABLE public.employees
ADD COLUMN reporting_manager_id UUID REFERENCES public.employees(emp_id) ON DELETE SET NULL;

-- 2. Create Leave_Types Table and Refactor Leave_Requests
-- Create the new table
CREATE TABLE public.leave_types (
  leave_type_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leave_name TEXT NOT NULL UNIQUE,
  max_days_per_year INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view leave types" ON public.leave_types FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON public.leave_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default leave types
INSERT INTO public.leave_types (leave_name, max_days_per_year) VALUES
('Sick', 12),
('Vacation', 20),
('Personal', 5),
('Emergency', 5);

-- Add the new foreign key column to leave_requests
ALTER TABLE public.leave_requests
ADD COLUMN leave_type_id UUID REFERENCES public.leave_types(leave_type_id);

-- Migrate existing data from the old text column to the new foreign key
UPDATE public.leave_requests lr
SET leave_type_id = (SELECT lt.leave_type_id FROM public.leave_types lt WHERE lt.leave_name = INITCAP(lr.leave_type))
WHERE lr.leave_type_id IS NULL;

-- Drop the old leave_type column
ALTER TABLE public.leave_requests
DROP COLUMN leave_type;

-- Make the new foreign key column NOT NULL
ALTER TABLE public.leave_requests
ALTER COLUMN leave_type_id SET NOT NULL;


-- 3. Create Missing HR Tables
-- Policies Table
CREATE TABLE public.policies (
  policy_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name TEXT NOT NULL,
  description TEXT,
  rules_json JSONB,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.employees(emp_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR and CXO can manage policies" ON public.policies FOR ALL USING (
  auth.uid() IN (
    SELECT e.user_id FROM public.employees e JOIN public.roles r ON e.role_id = r.role_id WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);
CREATE POLICY "Authenticated users can view policies" ON public.policies FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Employee_Documents Table
CREATE TABLE public.employee_documents (
  doc_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emp_id UUID NOT NULL REFERENCES public.employees(emp_id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL, -- This would likely be a path in Supabase Storage
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can manage their own documents" ON public.employee_documents FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM public.employees WHERE emp_id = employee_documents.emp_id)
);
CREATE POLICY "HR and CXO can manage all documents" ON public.employee_documents FOR ALL USING (
  auth.uid() IN (
    SELECT e.user_id FROM public.employees e JOIN public.roles r ON e.role_id = r.role_id WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);

-- Bank_Details Table
CREATE TABLE public.bank_details (
  bank_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emp_id UUID NOT NULL UNIQUE REFERENCES public.employees(emp_id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_bank_details_updated_at BEFORE UPDATE ON public.bank_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Policy: Only employee and HR can see/manage bank details.
CREATE POLICY "Employees can manage their own bank details" ON public.bank_details FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM public.employees WHERE emp_id = bank_details.emp_id)
);
CREATE POLICY "HR and CXO can manage bank details" ON public.bank_details FOR ALL USING (
  auth.uid() IN (
    SELECT e.user_id FROM public.employees e JOIN public.roles r ON e.role_id = r.role_id WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);


-- 4. Implement Column-Level Security for Employees Table
-- First, create a function to get the role of the current user
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT r.role_name INTO user_role
  FROM public.employees e
  JOIN public.roles r ON e.role_id = r.role_id
  WHERE e.user_id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Next, create the trigger function to protect sensitive fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_employee_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the role of the user performing the update
  user_role := public.get_my_role();

  -- Allow all changes if user is HR Manager or CXO
  IF user_role IN ('HR Manager', 'CXO') THEN
    RETURN NEW;
  END IF;

  -- For other users, prevent changes to sensitive fields
  IF OLD.salary IS DISTINCT FROM NEW.salary OR
     OLD.role_id IS DISTINCT FROM NEW.role_id OR
     OLD.designation_id IS DISTINCT FROM NEW.designation_id OR
     OLD.department_id IS DISTINCT FROM NEW.department_id OR
     OLD.status IS DISTINCT FROM NEW.status OR
     OLD.reporting_manager_id IS DISTINCT FROM NEW.reporting_manager_id OR
     OLD.doj IS DISTINCT FROM NEW.doj OR
     OLD.username IS DISTINCT FROM NEW.username OR
     OLD.email IS DISTINCT FROM NEW.email
  THEN
    RAISE EXCEPTION 'You do not have permission to change sensitive employment details. Please contact HR.';
  END IF;

  -- Allow the update if no sensitive fields were changed by a non-privileged user
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to enforce the protection
CREATE TRIGGER before_employee_update_protect_fields
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.protect_sensitive_employee_fields();

-- Finally, update the RLS policies for the employees table
-- Drop the old permissive update policy
DROP POLICY "Users can update own employee record" ON public.employees;

-- Create a new policy that allows HR/CXO to update any record
CREATE POLICY "HR and CXO can update any employee record"
ON public.employees
FOR UPDATE
USING (
  public.get_my_role() IN ('HR Manager', 'CXO')
)
WITH CHECK (
  public.get_my_role() IN ('HR Manager', 'CXO')
);

-- Create a policy that allows users to update their own record (the trigger will handle column permissions)
CREATE POLICY "Users can update their own employee record"
ON public.employees
FOR UPDATE
USING (auth.uid() = user_id);