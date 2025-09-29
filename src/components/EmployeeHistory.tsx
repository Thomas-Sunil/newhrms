import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { History, Plus, Calendar, Building2, User } from "lucide-react";

interface EmployeeHistory {
  history_id: string;
  emp_id: string;
  old_designation_id?: string;
  new_designation_id?: string;
  old_dept_id?: string;
  new_dept_id?: string;
  old_salary?: number;
  new_salary?: number;
  start_date: string;
  end_date?: string;
  change_reason?: string;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    username: string;
  };
  old_designation?: {
    designation_name: string;
  };
  new_designation?: {
    designation_name: string;
  };
  old_department?: {
    dept_name: string;
  };
  new_department?: {
    dept_name: string;
  };
}

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
  username: string;
  designation_id?: string;
  department_id?: string;
  salary?: number;
}

interface Designation {
  designation_id: string;
  designation_name: string;
}

interface Department {
  dept_id: string;
  dept_name: string;
}

interface EmployeeHistoryProps {
  selectedEmployeeId?: string;
  showAllEmployees?: boolean;
}

const EmployeeHistory = ({ selectedEmployeeId, showAllEmployees = false }: EmployeeHistoryProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  
  const [history, setHistory] = useState<EmployeeHistory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHistory, setEditingHistory] = useState<EmployeeHistory | null>(null);

  // Form state
  const [selectedEmployeeId2, setSelectedEmployeeId2] = useState("");
  const [newDesignationId, setNewDesignationId] = useState("");
  const [newDeptId, setNewDeptId] = useState("");
  const [newSalary, setNewSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [changeReason, setChangeReason] = useState("");

  const userRole = employee?.roles?.role_name;
  const isHROrCXO = userRole === 'HR Manager' || userRole === 'CXO';
  const isDeptHead = userRole === 'Department Head';
  const isTeamLead = userRole === 'Team Lead';
  const isEmployee = userRole === 'Employee';

  useEffect(() => {
    fetchHistory();
    if (isHROrCXO || isDeptHead || isTeamLead) {
      fetchEmployees();
      fetchDesignations();
      fetchDepartments();
    }
  }, [selectedEmployeeId, showAllEmployees]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('employee_history')
        .select(`
          *,
          employee:employees!employee_history_emp_id_fkey(first_name, last_name, username),
          old_designation:designations!employee_history_old_designation_id_fkey(designation_name),
          new_designation:designations!employee_history_new_designation_id_fkey(designation_name),
          old_department:departments!employee_history_old_dept_id_fkey(dept_name),
          new_department:departments!employee_history_new_dept_id_fkey(dept_name)
        `)
        .order('created_at', { ascending: false });

      if (selectedEmployeeId && !showAllEmployees) {
        query = query.eq('emp_id', selectedEmployeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employee history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      let query = supabase
        .from('employees')
        .select('emp_id, first_name, last_name, username, designation_id, department_id, salary')
        .eq('status', 'active');

      if (isDeptHead && employee?.department_id) {
        query = query.eq('department_id', employee.department_id);
      } else if (isTeamLead && employee?.emp_id) {
        query = query.eq('reporting_manager_id', employee.emp_id);
      }

      const { data, error } = await query.order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const { data, error } = await supabase
        .from('designations')
        .select('*')
        .order('designation_name');

      if (error) throw error;
      setDesignations(data || []);
    } catch (error: any) {
      console.error('Error fetching designations:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('dept_name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleCreateHistory = async () => {
    if (!selectedEmployeeId2 || (!newDesignationId && !newDeptId && !newSalary)) {
      toast({
        title: "Error",
        description: "Please select an employee and at least one change (designation, department, or salary)",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get current employee data
      const { data: currentEmployee, error: empError } = await supabase
        .from('employees')
        .select('designation_id, department_id, salary')
        .eq('emp_id', selectedEmployeeId2)
        .single();

      if (empError) throw empError;

      // Update employee record (this will trigger the history creation automatically)
      const updateData: any = {};
      if (newDesignationId) updateData.designation_id = newDesignationId;
      if (newDeptId) updateData.department_id = newDeptId;
      if (newSalary) updateData.salary = parseFloat(newSalary);

      const { error: updateError } = await supabase
        .from('employees')
        .update(updateData)
        .eq('emp_id', selectedEmployeeId2);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Employee history updated successfully"
      });

      resetForm();
      setDialogOpen(false);
      fetchHistory();
    } catch (error: any) {
      console.error('Error creating history:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update employee history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId2("");
    setNewDesignationId("");
    setNewDeptId("");
    setNewSalary("");
    setStartDate("");
    setEndDate("");
    setChangeReason("");
    setEditingHistory(null);
  };

  const getChangeType = (historyItem: EmployeeHistory) => {
    const changes = [];
    if (historyItem.old_designation_id !== historyItem.new_designation_id) {
      changes.push('Designation');
    }
    if (historyItem.old_dept_id !== historyItem.new_dept_id) {
      changes.push('Department');
    }
    if (historyItem.old_salary !== historyItem.new_salary) {
      changes.push('Salary');
    }
    return changes.join(' + ');
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Employee History
          </CardTitle>
          <CardDescription>
            Track role changes, salary revisions, and department transfers
          </CardDescription>
        </div>
 
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {showAllEmployees && <TableHead>Employee</TableHead>}
                  <TableHead>Change Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showAllEmployees ? 7 : 6} className="text-center py-8">
                      No history records found
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item) => (
                    <TableRow key={item.history_id}>
                      {showAllEmployees && (
                        <TableCell>
                          <div className="font-medium">
                            {item.employee?.first_name} {item.employee?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.employee?.username}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline">
                          {getChangeType(item)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {item.old_designation?.designation_name && (
                            <div className="flex items-center">
                              <User className="mr-1 h-3 w-3" />
                              {item.old_designation.designation_name}
                            </div>
                          )}
                          {item.old_department?.dept_name && (
                            <div className="flex items-center">
                              <Building2 className="mr-1 h-3 w-3" />
                              {item.old_department.dept_name}
                            </div>
                          )}
                          {item.old_salary && (
                            <div className="flex items-center">
                              
                              {formatCurrency(item.old_salary)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {item.new_designation?.designation_name && (
                            <div className="flex items-center">
                              <User className="mr-1 h-3 w-3" />
                              {item.new_designation.designation_name}
                            </div>
                          )}
                          {item.new_department?.dept_name && (
                            <div className="flex items-center">
                              <Building2 className="mr-1 h-3 w-3" />
                              {item.new_department.dept_name}
                            </div>
                          )}
                          {item.new_salary && (
                            <div className="flex items-center">
                              
                              {formatCurrency(item.new_salary)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(item.start_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.end_date ? (
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-1 h-3 w-3" />
                            {new Date(item.end_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{item.change_reason || 'N/A'}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Update Employee Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Employee Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="employee" className="text-right">Employee</Label>
                <Select value={selectedEmployeeId2} onValueChange={setSelectedEmployeeId2}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.emp_id} value={emp.emp_id}>
                        {emp.first_name} {emp.last_name} ({emp.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="designation" className="text-right">New Designation</Label>
                <Select value={newDesignationId} onValueChange={setNewDesignationId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select designation (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No change</SelectItem>
                    {designations.map((des) => (
                      <SelectItem key={des.designation_id} value={des.designation_id}>
                        {des.designation_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right">New Department</Label>
                <Select value={newDeptId} onValueChange={setNewDeptId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No change</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.dept_id} value={dept.dept_id}>
                        {dept.dept_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="salary" className="text-right">New Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  placeholder="Enter new salary (optional)"
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">Reason</Label>
                <Textarea
                  id="reason"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Reason for change (optional)"
                  className="col-span-3"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateHistory} disabled={loading}>
                {loading ? "Updating..." : "Update Employee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default EmployeeHistory;