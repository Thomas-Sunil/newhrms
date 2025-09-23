import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeType: 'HR' | 'CXO' | 'Employee' | 'Department Head';
  onSuccess: () => void;
}

interface Department {
  dept_id: string;
  dept_name: string;
}

interface Role {
  role_id: string;
  role_name: string;
}

interface Designation {
  designation_id: string;
  designation_name: string;
}

const CreateEmployeeDialog = ({ open, onOpenChange, employeeType, onSuccess }: CreateEmployeeDialogProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "Password123",
    departmentId: "",
    designationId: "",
    phone: "",
    address: "",
    salary: "",
    gender: "",
    dob: "",
    doj: ""
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
      // Auto-fill designation based on employee type
      const designationMap = {
        'HR': 'HR Manager',
        'CXO': 'CXO', 
        'Department Head': 'Department Head',
        'Employee': '' // No auto-fill for regular employees
      };
      
      setFormData(prev => ({
        ...prev,
        // Reset form but keep auto-filled designation
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "Password123",
        departmentId: "",
        designationId: "", // Will be set after designations are loaded
        phone: "",
        address: "",
        salary: "",
        gender: "",
        dob: "",
        doj: ""
      }));
    }
  }, [open, employeeType]);

  // Auto-fill designation after designations are loaded
  useEffect(() => {
    if (designations.length > 0) {
      const designationMap = {
        'HR': 'HR Manager',
        'CXO': 'CXO', 
        'Department Head': 'Department Head',
        'Employee': '' // No auto-fill for regular employees
      };
      
      const targetDesignationName = designationMap[employeeType];
      if (targetDesignationName) {
        const targetDesignation = designations.find(d => d.designation_name === targetDesignationName);
        if (targetDesignation) {
          setFormData(prev => ({
            ...prev,
            designationId: targetDesignation.designation_id
          }));
        }
      }
    }
  }, [designations, employeeType]);

  const fetchData = async () => {
    try {
      const [deptResult, roleResult, desigResult] = await Promise.all([
        supabase.from('departments').select('*').order('dept_name'),
        supabase.from('roles').select('*').eq('role_name', 
          employeeType === 'HR' ? 'HR Manager' : 
          employeeType === 'CXO' ? 'CXO' : 
          employeeType === 'Department Head' ? 'Department Head' : 'Employee'
        ),
        supabase.from('designations').select('*').order('designation_name')
      ]);

      if (deptResult.error) throw deptResult.error;
      if (roleResult.error) throw roleResult.error;
      if (desigResult.error) throw desigResult.error;

      setDepartments(deptResult.data || []);
      setRoles(roleResult.data || []);
      setDesignations(desigResult.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch form data",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.username) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create via edge function to handle auth + employee creation
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: {
          ...formData,
          roleId: roles[0]?.role_id,
          employeeType
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${employeeType} created successfully`
      });

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "Password123",
        departmentId: "",
        designationId: "",
        phone: "",
        address: "",
        salary: "",
        gender: "",
        dob: "",
        doj: ""
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to create ${employeeType}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create {
            employeeType === 'HR' ? 'HR Manager' : 
            employeeType === 'CXO' ? 'CXO' : 
            employeeType === 'Department Head' ? 'Department Head' : 'Employee'
          }</DialogTitle>
          <DialogDescription>
            Add a new {
              employeeType === 'HR' ? 'HR Manager' : 
              employeeType === 'CXO' ? 'CXO' : 
              employeeType === 'Department Head' ? 'Department Head' : 'Employee'
            } to your organization.
            <br /><br />
            <strong>Important:</strong> Each employee must have a unique email address and username.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={isLoading}
                placeholder="Enter unique email address"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Each employee must have a unique email address
              </p>
            </div>

            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                disabled={isLoading}
                placeholder="Enter unique username"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Username must be unique across all employees
              </p>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={formData.departmentId} onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.dept_id} value={dept.dept_id}>
                      {dept.dept_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="designation">Designation {employeeType !== 'Employee' ? '(Auto-filled)' : ''}</Label>
              <Select 
                value={formData.designationId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, designationId: value }))}
                disabled={employeeType !== 'Employee'} // Disable for specific employee types
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((desig) => (
                    <SelectItem key={desig.designation_id} value={desig.designation_id}>
                      {desig.designation_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={isLoading}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                  disabled={isLoading}
                  placeholder="Enter salary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="doj">Joining Date *</Label>
              <Input
                id="doj"
                type="date"
                value={formData.doj}
                onChange={(e) => setFormData(prev => ({ ...prev, doj: e.target.value }))}
                disabled={isLoading}
                placeholder="Select joining date"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select the employee's date of joining
              </p>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                disabled={isLoading}
                placeholder="Enter full address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : `Create ${employeeType}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEmployeeDialog;