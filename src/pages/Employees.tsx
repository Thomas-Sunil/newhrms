import { useEffect, useState } from "react";
import { Users, Plus, Edit, Trash2, Crown, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CreateEmployeeDialog from "@/components/CreateEmployeeDialog";
import EditEmployeeDialog from "@/components/EditEmployeeDialog";
import HRMSLayout from "@/components/HRMSLayout";
import { useAuth } from "@/contexts/AuthContext";

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  status: string;
  roles?: { role_name: string };
  designations?: { designation_name: string };
  departments?: { dept_name: string };
  created_at: string;
  department_id?: string;
  reporting_manager_id?: string;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeType, setEmployeeType] = useState<'HR' | 'CXO' | 'Employee' | 'Department Head'>('Employee');
  const { toast } = useToast();
  const { employee: currentUser } = useAuth();

  const userRole = currentUser?.roles?.role_name;
  const isHROrCXO = userRole === 'HR Manager' || userRole === 'CXO';
  const isDeptHead = userRole === 'Department Head';
  const isTeamLead = userRole === 'Team Lead';
  const isRegularEmployee = userRole === 'Employee';

  const fetchEmployees = async () => {
    setLoading(true);
    let query = supabase
      .from('employees')
      .select(`
        *,
        roles(role_name),
        designations(designation_name),
        departments!employees_department_id_fkey(dept_name)
      `);

    if (isHROrCXO) {
      // HR/CXO sees all active employees
      query = query.eq('status', 'active').order('first_name');
    } else if (isDeptHead && currentUser?.department_id) {
      // Department Head sees employees in their department
      query = query.eq('department_id', currentUser.department_id).eq('status', 'active').order('first_name');
    } else if (isTeamLead && currentUser?.emp_id) {
      // Team Lead sees employees reporting to them
      query = query.eq('reporting_manager_id', currentUser.emp_id).eq('status', 'active').order('first_name');
    } else if (isRegularEmployee && currentUser?.emp_id) {
      // Regular employee sees only themselves
      query = query.eq('emp_id', currentUser.emp_id);
    } else {
      // Fallback for unhandled roles or missing data
      setEmployees([]);
      setLoading(false);
      return;
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      });
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      fetchEmployees();
    }
  }, [currentUser]);

  const handleDeleteEmployee = async (empId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('emp_id', empId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${name} deleted successfully`
      });
      
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive"
      });
    }
  };

  const handleCreateEmployee = (type: 'HR' | 'CXO' | 'Employee' | 'Department Head') => {
    setEmployeeType(type);
    setCreateDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditDialogOpen(true);
  };

  const getPageTitle = () => {
    if (isHROrCXO) return "Employee Management";
    if (isDeptHead) return "My Department Employees";
    if (isTeamLead) return "My Team Members";
    if (isRegularEmployee) return "My Profile";
    return "Employees";
  };

  const getPageDescription = () => {
    if (isHROrCXO) return "Manage all employees in the organization.";
    if (isDeptHead) return "View and manage employees in your department.";
    if (isTeamLead) return "View and manage employees reporting to you.";
    if (isRegularEmployee) return "View your own employee details.";
    return "View employee information.";
  };

  if (loading) {
    return (
      <HRMSLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </HRMSLayout>
    );
  }

  return (
    <HRMSLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
            <p className="text-muted-foreground">{getPageDescription()}</p>
          </div>
          {isHROrCXO && (
            <div className="flex space-x-2">
              <Button onClick={() => handleCreateEmployee('Employee')} variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
              <Button onClick={() => handleCreateEmployee('CXO')}>
                <Crown className="mr-2 h-4 w-4" />
                Add Executive
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <Card key={emp.emp_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  {emp.roles?.role_name === 'CXO' ? (
                    <Crown className="h-8 w-8 text-yellow-500" />
                  ) : (
                    <UserCheck className="h-8 w-8 text-blue-500" />
                  )}
                  <div className="flex space-x-2">
                    {(isHROrCXO || (isDeptHead && emp.department_id === currentUser?.department_id) || (isTeamLead && emp.reporting_manager_id === currentUser?.emp_id)) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditEmployee(emp)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {(isHROrCXO || (isDeptHead && emp.department_id === currentUser?.department_id) || (isTeamLead && emp.reporting_manager_id === currentUser?.emp_id)) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditEmployee(emp)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {(isHROrCXO || (isDeptHead && emp.department_id === currentUser?.department_id) || (isTeamLead && emp.reporting_manager_id === currentUser?.emp_id)) && currentUser?.emp_id !== emp.emp_id && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteEmployee(emp.emp_id, `${emp.first_name} ${emp.last_name}`)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardTitle>{emp.first_name} {emp.last_name}</CardTitle>
                <CardDescription>@{emp.username}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  <Badge variant={emp.roles?.role_name === 'CXO' ? 'default' : 'secondary'}>
                    {emp.roles?.role_name}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Department:</span>
                  <span className="text-sm">{emp.departments?.dept_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Designation:</span>
                  <span className="text-sm">{emp.designations?.designation_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={emp.status === 'active' ? 'default' : 'destructive'}>
                    {emp.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Created: {new Date(emp.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <CreateEmployeeDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          employeeType={employeeType}
          onSuccess={fetchEmployees}
        />

        <EditEmployeeDialog 
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          employee={selectedEmployee}
          onSuccess={fetchEmployees}
        />
      </div>
    </HRMSLayout>
  );
};

export default Employees;
