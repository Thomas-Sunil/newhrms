-- Add emp_id column to public.leave_requests table if it doesn't exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leave_requests'
      AND column_name = 'emp_id'
  ) THEN
    ALTER TABLE public.leave_requests
    ADD COLUMN emp_id UUID;
  END IF;
END $$;

-- Add NOT NULL constraint and default value if emp_id was just added and is null
-- This assumes that existing leave requests without emp_id are invalid or need to be handled.
-- For simplicity, we'll assume new emp_id will be populated correctly.
-- If there are existing rows with NULL emp_id, this will fail. Manual data migration might be needed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leave_requests'
      AND column_name = 'emp_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'leave_requests'
      AND column_name = 'emp_id'
      AND constraint_name = 'leave_requests_emp_id_fkey'
  ) THEN
    -- First, ensure all existing rows have a valid emp_id if we're adding NOT NULL
    -- This might require a manual update if there are existing rows with NULL emp_id
    -- For now, we'll assume emp_id will be populated on insert or updated manually.
    -- If you have existing rows with NULL emp_id, you MUST update them before running this.
    -- Example: UPDATE public.leave_requests SET emp_id = (SELECT emp_id FROM public.employees LIMIT 1) WHERE emp_id IS NULL;

    ALTER TABLE public.leave_requests
    ALTER COLUMN emp_id SET NOT NULL;

    ALTER TABLE public.leave_requests
    ADD CONSTRAINT leave_requests_emp_id_fkey
    FOREIGN KEY (emp_id)
    REFERENCES public.employees(emp_id) ON DELETE CASCADE;
  END IF;
END $$;