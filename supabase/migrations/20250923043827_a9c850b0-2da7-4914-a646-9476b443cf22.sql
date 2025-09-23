-- Allow authenticated users to insert departments (CXOs can create departments)
CREATE POLICY "Authenticated users can create departments" ON public.departments
FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update departments (for assigning department heads)
CREATE POLICY "Authenticated users can update departments" ON public.departments
FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to delete departments
CREATE POLICY "Authenticated users can delete departments" ON public.departments
FOR DELETE TO authenticated USING (true);