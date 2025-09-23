-- Create roles table
CREATE TABLE public.roles (
  role_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table  
CREATE TABLE public.departments (
  dept_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dept_name TEXT NOT NULL,
  dept_head_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create designations table
CREATE TABLE public.designations (
  designation_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  designation_name TEXT NOT NULL,
  level INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  emp_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  dob DATE,
  doj DATE NOT NULL DEFAULT CURRENT_DATE,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  salary DECIMAL(12,2),
  username TEXT NOT NULL UNIQUE,
  role_id UUID REFERENCES public.roles(role_id),
  designation_id UUID REFERENCES public.designations(designation_id),
  department_id UUID REFERENCES public.departments(dept_id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resigned', 'terminated', 'retired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employment_history table
CREATE TABLE public.employment_history (
  history_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emp_id UUID NOT NULL REFERENCES public.employees(emp_id) ON DELETE CASCADE,
  old_designation_id UUID REFERENCES public.designations(designation_id),
  new_designation_id UUID NOT NULL REFERENCES public.designations(designation_id),
  old_dept_id UUID REFERENCES public.departments(dept_id),
  new_dept_id UUID NOT NULL REFERENCES public.departments(dept_id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  recommended_by UUID REFERENCES public.employees(emp_id),
  reviewed_by UUID REFERENCES public.employees(emp_id),
  approved_by UUID REFERENCES public.employees(emp_id),
  change_reason TEXT CHECK (change_reason IN ('Promotion', 'Transfer', 'Onboarding', 'Reassignment', 'Demotion')),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint for dept_head_id after employees table is created
ALTER TABLE public.departments 
ADD CONSTRAINT fk_dept_head 
FOREIGN KEY (dept_head_id) REFERENCES public.employees(emp_id);

-- Enable Row Level Security
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view designations" ON public.designations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view employment history" ON public.employment_history FOR SELECT TO authenticated USING (true);

-- Users can update their own employee record
CREATE POLICY "Users can update own employee record" ON public.employees 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- Insert initial roles
INSERT INTO public.roles (role_name, description) VALUES
('CXO', 'Chief Executive and C-level Officers'),
('HR Manager', 'Human Resources Manager'),
('Department Head', 'Head of Department'),
('Team Lead', 'Team Leader'),
('Employee', 'Regular Employee');

-- Insert initial departments
INSERT INTO public.departments (dept_name) VALUES
('Board of Directors'),
('Human Resources'),
('Engineering'),
('Sales & Marketing'),
('Finance');

-- Insert initial designations
INSERT INTO public.designations (designation_name, level) VALUES
('Chief Executive Officer', 1),
('Chief Technology Officer', 1),
('Chief Financial Officer', 1),
('HR Manager', 2),
('Department Head', 3),
('Team Lead', 4),
('Senior Engineer', 5),
('Engineer', 6),
('Sales Manager', 3),
('Marketing Manager', 3);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_designations_updated_at BEFORE UPDATE ON public.designations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employment_history_updated_at BEFORE UPDATE ON public.employment_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();