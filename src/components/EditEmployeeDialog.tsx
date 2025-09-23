import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  onSuccess: () => void;
}

// Define types for the data we'll fetch
interface Department { dept_id: string; dept_name: string; }
interface Designation { designation_id: string; designation_name: string; }
interface Role { role_id: string; role_name: string; }
interface Employee { emp_id: string; first_name: string; last_name: string; }

const TOP_LEVEL_ROLES = ['Department Head', 'CXO', 'HR Manager'];

const EditEmployeeDialog = ({ open, onOpenChange, employee, onSuccess }: EditEmployeeDialogProps) => {
  const [formData, setFormData] = useState<any>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [topLevelRoleIds, setTopLevelRoleIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (employee && open) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        address: employee.address || '',
        dob: employee.dob || '',
        doj: employee.doj || '',
        gender: employee.gender || '',
        salary: employee.salary || '',
        username: employee.username || '',
        status: employee.status || 'active',
        department_id: employee.department_id || null,
        designation_id: employee.designation_id || null,
        role_id: employee.role_id || null,
        reporting_manager_id: employee.reporting_manager_id || null,
      });
      fetchDropdownData();
    }
  }, [employee, open]);

  useEffect(() => {
    if (roles.length > 0) {
      const ids = roles
        .filter(r => TOP_LEVEL_ROLES.includes(r.role_name))
        .map(r => r.role_id);
      setTopLevelRoleIds(ids);
    }
  }, [roles]);

  const fetchDropdownData = async () => {
    try {
      const [deptRes, desigRes, roleRes, empRes] = await Promise.all([
        supabase.from('departments').select('dept_id, dept_name').order('dept_name'),
        supabase.from('designations').select('designation_id, designation_name').order('designation_name'),
        supabase.from('roles').select('role_id, role_name').order('role_name'),
        supabase.from('employees').select('emp_id, first_name, last_name').order('first_name'),
      ]);

      if (deptRes.data) setDepartments(deptRes.data);
      if (desigRes.data) setDesignations(desigRes.data);
      if (roleRes.data) setRoles(roleRes.data);
      if (empRes.data) setEmployees(empRes.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      toast({ title: "Error", description: "Failed to load necessary data for editing.", variant: "destructive" });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    const newFormData = { ...formData, [id]: value === "none" ? null : value };

    if (id === 'role_id' && topLevelRoleIds.includes(value)) {
      newFormData.reporting_manager_id = employee.emp_id;
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Defensively clean the data before submission
      const updateData = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        department_id: formData.department_id || null,
        designation_id: formData.designation_id || null,
        role_id: formData.role_id || null,
        reporting_manager_id: formData.reporting_manager_id || null,
        dob: formData.dob || null,
        doj: formData.doj || null,
        gender: formData.gender || null,
      };

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('emp_id', employee.emp_id);

      if (error) throw error;

      toast({ title: "Success", description: "Employee updated successfully" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update employee", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const isTopLevelRole = topLevelRoleIds.includes(formData.role_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update details for {employee?.first_name} {employee?.last_name}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" value={formData.first_name} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" value={formData.last_name} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={formData.username} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formData.phone} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={formData.address} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={formData.dob} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Do not specify</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doj">Date of Joining</Label>
              <Input id="doj" type="date" value={formData.doj} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary</Label>
              <Input id="salary" type="number" value={formData.salary} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department_id">Department</Label>
              <Select value={formData.department_id} onValueChange={(value) => handleSelectChange('department_id', value)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map(d => <SelectItem key={d.dept_id} value={d.dept_id}>{d.dept_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation_id">Designation</Label>
              <Select value={formData.designation_id} onValueChange={(value) => handleSelectChange('designation_id', value)}>
                <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {designations.map(d => <SelectItem key={d.designation_id} value={d.designation_id}>{d.designation_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role_id">Role</Label>
              <Select value={formData.role_id} onValueChange={(value) => handleSelectChange('role_id', value)}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r.role_id} value={r.role_id}>{r.role_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporting_manager_id">Reporting Manager</Label>
              <Select 
                value={formData.reporting_manager_id}
                onValueChange={(value) => handleSelectChange('reporting_manager_id', value)}
                disabled={isTopLevelRole}
              >
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {employees.map(e => <SelectItem key={e.emp_id} value={e.emp_id}>{e.first_name} {e.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {isTopLevelRole && <p className="text-xs text-muted-foreground">This role reports to themselves.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Updating..." : "Update Employee"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeDialog;