-- Phase 2: Task & Project Management Module

-- 1. Create Projects Table
CREATE TABLE public.projects (
  project_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  description TEXT,
  dept_id UUID NOT NULL REFERENCES public.departments(dept_id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.employees(emp_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create Tasks Table
CREATE TABLE public.tasks (
  task_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.employees(emp_id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.employees(emp_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. RLS Policies for Projects
-- View Policy: Employees can see projects in their own department.
CREATE POLICY "Employees can view projects in their department"
ON public.projects FOR SELECT USING (
  dept_id IN (
    SELECT department_id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Insert Policy: Dept Heads, HR, and CXOs can create projects.
CREATE POLICY "Managers can create projects"
ON public.projects FOR INSERT WITH CHECK (
  public.get_my_role() IN ('Department Head', 'HR Manager', 'CXO')
);

-- Update Policy: Project leads, Dept Heads, HR, and CXOs can update projects.
CREATE POLICY "Leads and managers can update projects"
ON public.projects FOR UPDATE USING (
  (public.get_my_role() IN ('Department Head', 'HR Manager', 'CXO')) OR
  (lead_id IN (SELECT emp_id FROM public.employees WHERE user_id = auth.uid()))
);

-- Delete Policy: Only HR and CXOs can delete projects.
CREATE POLICY "Admins can delete projects"
ON public.projects FOR DELETE USING (
  public.get_my_role() IN ('HR Manager', 'CXO')
);


-- 4. RLS Policies for Tasks
-- View Policies
CREATE POLICY "Employees can view their own tasks"
ON public.tasks FOR SELECT USING (
  assigned_to IN (SELECT emp_id FROM public.employees WHERE user_id = auth.uid())
);

CREATE POLICY "Managers can view their department's tasks"
ON public.tasks FOR SELECT USING (
  (public.get_my_role() IN ('Team Lead', 'Department Head', 'HR Manager', 'CXO')) AND
  (project_id IN (
    SELECT p.project_id FROM public.projects p
    JOIN public.employees e ON p.dept_id = e.department_id
    WHERE e.user_id = auth.uid()
  ))
);

-- Insert Policy
CREATE POLICY "Leads and managers can assign tasks"
ON public.tasks FOR INSERT WITH CHECK (
  public.get_my_role() IN ('Team Lead', 'Department Head', 'HR Manager', 'CXO')
);

-- Update Policy
CREATE POLICY "Users can update tasks based on their role"
ON public.tasks FOR UPDATE USING (true)
WITH CHECK (
  -- Case 1: User is a manager, they can update anything.
  (public.get_my_role() IN ('Team Lead', 'Department Head', 'HR Manager', 'CXO')) OR

  -- Case 2: User is the assignee, they can only update the status.
  (
    (assigned_to IN (SELECT emp_id FROM public.employees WHERE user_id = auth.uid())) AND
    (
      title = OLD.title AND
      description = OLD.description AND
      project_id = OLD.project_id AND
      assigned_to = OLD.assigned_to AND
      assigned_by = OLD.assigned_by AND
      deadline = OLD.deadline
    )
  )
);

-- Delete Policy
CREATE POLICY "Leads and managers can delete tasks"
ON public.tasks FOR DELETE USING (
  public.get_my_role() IN ('Team Lead', 'Department Head', 'HR Manager', 'CXO')
);
