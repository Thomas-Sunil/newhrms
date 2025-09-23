import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: {
    dept_id: string;
    dept_name: string;
    dept_head_id: string | null;
  } | null;
  onSuccess: () => void;
}

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
}

const EditDepartmentDialog = ({ open, onOpenChange, department, onSuccess }: EditDepartmentDialogProps) => {
  const [formData, setFormData] = useState({
    deptName: "",
    deptHeadId: ""
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && department) {
      setFormData({
        deptName: department.dept_name,
        deptHeadId: department.dept_head_id || "none"
      });
      fetchEmployees();
    }
  }, [open, department]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('emp_id, first_name, last_name')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.deptName.trim()) {
      toast({
        title: "Error",
        description: "Department name is required",
        variant: "destructive"
      });
      return;
    }

    if (!department) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('departments')
        .update({
          dept_name: formData.deptName.trim(),
          dept_head_id: formData.deptHeadId === "none" ? null : formData.deptHeadId
        })
        .eq('dept_id', department.dept_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department updated successfully"
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update department",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!department) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Update department details and assign a department head.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="deptName">Department Name *</Label>
              <Input
                id="deptName"
                value={formData.deptName}
                onChange={(e) => setFormData(prev => ({ ...prev, deptName: e.target.value }))}
                disabled={isLoading}
                placeholder="Enter department name"
              />
            </div>

            <div>
              <Label htmlFor="deptHead">Department Head</Label>
              <Select 
                value={formData.deptHeadId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, deptHeadId: value }))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department head (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department head</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.emp_id} value={emp.emp_id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDepartmentDialog;