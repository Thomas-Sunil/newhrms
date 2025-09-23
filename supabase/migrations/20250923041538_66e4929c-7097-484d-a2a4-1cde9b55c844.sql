-- Allow public (anon) read on lookup tables for initial setup/login
CREATE POLICY "Public can view roles (anon)" ON public.roles
FOR SELECT TO anon USING (true);

CREATE POLICY "Public can view departments (anon)" ON public.departments
FOR SELECT TO anon USING (true);

CREATE POLICY "Public can view designations (anon)" ON public.designations
FOR SELECT TO anon USING (true);

-- Allow anon to check if CEO exists (only username 'ceo')
CREATE POLICY "Anon can check CEO existence" ON public.employees
FOR SELECT TO anon USING (username = 'ceo');

-- Allow anon to insert CEO employee record only (bootstrap)
CREATE POLICY "Anon can insert CEO employee once" ON public.employees
FOR INSERT TO anon WITH CHECK (username = 'ceo');

-- Also allow authenticated users to insert their own employee record
CREATE POLICY "Users can insert own employee record" ON public.employees
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
