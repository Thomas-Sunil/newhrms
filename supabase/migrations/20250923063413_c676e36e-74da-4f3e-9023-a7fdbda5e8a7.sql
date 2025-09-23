-- Fix migration: create attendance + RLS and tighten departments/employees policies

-- Attendance table (idempotent)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (emp_id, date)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_emp_fk'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_emp_fk
      FOREIGN KEY (emp_id)
      REFERENCES public.employees(emp_id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Drop any existing attendance policies (safe if none)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'Employees can view own attendance') THEN
    DROP POLICY "Employees can view own attendance" ON public.attendance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'Employees can insert own attendance') THEN
    DROP POLICY "Employees can insert own attendance" ON public.attendance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'Employees can update own attendance') THEN
    DROP POLICY "Employees can update own attendance" ON public.attendance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'Dept heads can view department attendance') THEN
    DROP POLICY "Dept heads can view department attendance" ON public.attendance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'HR can view all attendance') THEN
    DROP POLICY "HR can view all attendance" ON public.attendance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'HR can update all attendance') THEN
    DROP POLICY "HR can update all attendance" ON public.attendance;
  END IF;
END $$;

-- Create attendance policies
CREATE POLICY "Employees can view own attendance"
ON public.attendance
FOR SELECT
USING (
  auth.uid() IN (
    SELECT e.user_id FROM public.employees e WHERE e.emp_id = attendance.emp_id
  )
);

CREATE POLICY "Employees can insert own attendance"
ON public.attendance
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT e.user_id FROM public.employees e WHERE e.emp_id = attendance.emp_id
  )
);

CREATE POLICY "Employees can update own attendance"
ON public.attendance
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT e.user_id FROM public.employees e WHERE e.emp_id = attendance.emp_id
  )
);

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

CREATE POLICY "HR can update all attendance"
ON public.attendance
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.role_id
    WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_attendance_updated_at') THEN
    CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Tighten departments policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'Authenticated users can create departments') THEN
    DROP POLICY "Authenticated users can create departments" ON public.departments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'Authenticated users can update departments') THEN
    DROP POLICY "Authenticated users can update departments" ON public.departments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'Authenticated users can delete departments') THEN
    DROP POLICY "Authenticated users can delete departments" ON public.departments;
  END IF;
END $$;

CREATE POLICY "HR and CXO can create departments"
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.role_id
    WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);

CREATE POLICY "HR and CXO can update departments"
ON public.departments
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.role_id
    WHERE r.role_name IN ('HR Manager', 'CXO')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.role_id
    WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);

CREATE POLICY "HR and CXO can delete departments"
ON public.departments
FOR DELETE
USING (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.role_id
    WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);

-- Restrict employees insert to HR/CXO
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Users can insert own employee record') THEN
    DROP POLICY "Users can insert own employee record" ON public.employees;
  END IF;
END $$;

CREATE POLICY "HR and CXO can create employees"
ON public.employees
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT e.user_id
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.role_id
    WHERE r.role_name IN ('HR Manager', 'CXO')
  )
);
