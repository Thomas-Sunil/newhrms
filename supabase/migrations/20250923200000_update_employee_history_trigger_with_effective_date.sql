-- Update trigger to log changes to employment_history with effective date

CREATE OR REPLACE FUNCTION public.log_employee_changes_to_history()
RETURNS TRIGGER AS $$
DECLARE
  _old_designation_id UUID;
  _new_designation_id UUID;
  _old_dept_id UUID;
  _new_dept_id UUID;
  _old_salary NUMERIC;
  _new_salary NUMERIC;
  _change_reason TEXT;
  _effective_date DATE;
  _request_headers JSONB;
BEGIN
  _change_reason := NULL; -- Initialize reason
  _effective_date := CURRENT_DATE; -- Default to current date

  -- Try to get effective date from custom header
  BEGIN
    _request_headers := current_setting('request.headers', true)::jsonb;
    IF _request_headers ? 'x-effective-date' THEN
      _effective_date := (_request_headers->>'x-effective-date')::DATE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Handle case where request.headers is not available or malformed
    _effective_date := CURRENT_DATE;
  END;

  -- Check for designation change
  IF OLD.designation_id IS DISTINCT FROM NEW.designation_id THEN
    _old_designation_id := OLD.designation_id;
    _new_designation_id := NEW.designation_id;
    _change_reason := COALESCE(_change_reason, '') || 'Designation Change, ';
  END IF;

  -- Check for department change
  IF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
    _old_dept_id := OLD.department_id;
    _new_dept_id := NEW.department_id;
    _change_reason := COALESCE(_change_reason, '') || 'Department Change, ';
  END IF;

  -- Check for salary change
  IF OLD.salary IS DISTINCT FROM NEW.salary THEN
    _old_salary := OLD.salary;
    _new_salary := NEW.salary;
    _change_reason := COALESCE(_change_reason, '') || 'Salary Change, ';
  END IF;

  -- If any sensitive field changed, insert into employment_history
  IF _change_reason IS NOT NULL THEN
    -- Remove trailing comma and space
    _change_reason := TRIM(TRAILING ', ' FROM _change_reason);

    INSERT INTO public.employment_history (
      emp_id, old_designation_id, new_designation_id,
      old_dept_id, new_dept_id, old_salary, new_salary,
      change_reason, start_date
    )
    VALUES (
      NEW.emp_id, _old_designation_id, _new_designation_id,
      _old_dept_id, _new_dept_id, _old_salary, _new_salary,
      _change_reason, _effective_date
    );
  END IF;

  RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself does not need to be recreated, only the function it calls.
-- However, for completeness and to ensure the function is always up-to-date,
-- we can include the trigger creation here as well, after dropping if it exists.

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_log_employee_changes ON public.employees;

-- Create the trigger
CREATE TRIGGER trg_log_employee_changes
BEFORE UPDATE ON public.employees
FOR EACH ROW
WHEN (OLD.designation_id IS DISTINCT FROM NEW.designation_id OR
      OLD.department_id IS DISTINCT FROM NEW.department_id OR
      OLD.salary IS DISTINCT FROM NEW.salary)
EXECUTE FUNCTION public.log_employee_changes_to_history();