import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AssignDepartmentHeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: {
    dept_id: string;
    dept_name: string;
    current_head?: {
      first_name: string;
      last_name: string;
    };
  } | null;
  onSuccess: () => void;
}

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles?: { role_name: string };
  designations?: { designation_name: string };
}

const AssignDepartmentHeadDialog = ({ 
  open, 
  onOpenChange, 
  department, 
  onSuccess 
}: AssignDepartmentHeadDialogProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [eligibleEmployees, setEligibleEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && department) {
      fetchEligibleEmployees();
    }
  }, [open, department]);

  const fetchEligibleEmployees = async () => {
    try {
      // Get employees with "Department Head" designation only
      const { data: eligibleEmployees, error } = await supabase
        .from('employees')
        .select(`
          *,
          roles!role_id(role_name),
          designations!designation_id(designation_name)
        `)
        .eq('status', 'active')
        .eq('designations.designation_name', 'Department Head');

      if (error) throw error;
      setEligibleEmployees(eligibleEmployees || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch eligible employees",
        variant: "destructive"
      });
    }
  };

  const handleAssign = async () => {
    if (!selectedEmployeeId || !department) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('departments')
        .update({ dept_head_id: selectedEmployeeId })
        .eq('dept_id', department.dept_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Department head assigned successfully`
      });

      setSelectedEmployeeId("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to assign department head",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!department) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Department Head</DialogTitle>
          <DialogDescription>
            Assign a department head to <strong>{department.dept_name}</strong>.
            <br /><br />
            Only employees with "Department Head" role or designation are eligible.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {department.current_head && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Current Head:</p>
              <p className="text-sm text-muted-foreground">
                {department.current_head.first_name} {department.current_head.last_name}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Select New Department Head</label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose an eligible employee" />
              </SelectTrigger>
              <SelectContent>
                {eligibleEmployees.length > 0 ? (
                  eligibleEmployees.map((emp) => (
                    <SelectItem key={emp.emp_id} value={emp.emp_id}>
                      <div className="flex flex-col">
                        <span>{emp.first_name} {emp.last_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {emp.roles?.role_name} • {emp.designations?.designation_name}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No eligible employees found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {eligibleEmployees.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No employees with "Department Head" role or designation found.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={isLoading || !selectedEmployeeId || eligibleEmployees.length === 0}
          >
            {isLoading ? "Assigning..." : "Assign Head"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDepartmentHeadDialog;