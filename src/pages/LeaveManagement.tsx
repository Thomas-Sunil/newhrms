import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import HRMSLayout from "@/components/HRMSLayout";
import { Eye, CheckCircle, XCircle, Clock } from "lucide-react";

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_category_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  created_at: string;
  // Join data
  employee?: {
    first_name: string;
    last_name: string;
    username: string;
    department_id: string;
    role_id: string;
  };
  leave_category?: {
    name: string;
  };
  department?: {
    dept_name: string;
  };
  role?: {
    role_name: string;
  };
}

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveRequest: LeaveRequest | null;
  onSuccess: () => void;
  reviewerRole: 'Department Head' | 'HR Manager';
}

const ReviewDialog = ({ open, onOpenChange, leaveRequest, onSuccess, reviewerRole }: ReviewDialogProps) => {
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { employee } = useAuth();

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!leaveRequest) return;
    
    setIsLoading(true);
    
    try {
      let newStatus: string;
      
      if (reviewerRole === 'Department Head') {
        newStatus = action === 'approve' ? 'dept_approved' : 'dept_rejected';
      } else { // HR Manager
        newStatus = action === 'approve' ? 'approved' : 'rejected';
      }

      const { error } = await supabase
        .from('leave_applications')
        .update({
          status: newStatus,
          // You might want to add comment fields to your table schema
        })
        .eq('id', leaveRequest.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
      
      setComments("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${action} leave request: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!leaveRequest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {reviewerRole} Review - Leave Request
          </DialogTitle>
          <DialogDescription>
            Review and approve/reject the leave request
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employee</Label>
              <p className="text-sm font-medium">
                {leaveRequest.employee?.first_name} {leaveRequest.employee?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                ({leaveRequest.employee?.username})
              </p>
            </div>
            <div>
              <Label>Department & Role</Label>
              <p className="text-sm">{leaveRequest.department?.dept_name}</p>
              <p className="text-xs text-muted-foreground">{leaveRequest.role?.role_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Leave Type</Label>
              <p className="text-sm">{leaveRequest.leave_category?.name || 'N/A'}</p>
            </div>
            <div>
              <Label>Total Days</Label>
              <p className="text-sm">{leaveRequest.total_days}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <p className="text-sm">{new Date(leaveRequest.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <Label>End Date</Label>
              <p className="text-sm">{new Date(leaveRequest.end_date).toLocaleDateString()}</p>
            </div>
          </div>

          <div>
            <Label>Reason</Label>
            <p className="text-sm bg-muted p-3 rounded-lg">{leaveRequest.reason}</p>
          </div>

          <div>
            <Label htmlFor="comments">
              Comments (Optional)
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isLoading}
              placeholder="Add your comments here..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={() => handleAction('reject')} 
            disabled={isLoading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {isLoading ? "Processing..." : "Reject"}
          </Button>
          <Button 
            type="button" 
            onClick={() => handleAction('approve')} 
            disabled={isLoading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isLoading ? "Processing..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LeaveManagement = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const { employee: currentUser } = useAuth();
  const { toast } = useToast();

  const userRole = currentUser?.roles?.role_name;
  const isDeptHead = userRole === 'Department Head';
  const isHR = userRole === 'HR Manager';
  const isCXO = userRole === 'CXO';

  const fetchLeaveRequests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Apply basic filtering for regular employees at query level
      let query = supabase
        .from('leave_applications')
        .select(`
          id,
          employee_id,
          leave_category_id,
          start_date,
          end_date,
          total_days,
          reason,
          status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (!isDeptHead && !isHR && !isCXO) {
        // Regular employees see only their own requests
        query = query.eq('employee_id', currentUser?.emp_id);
      }

      const { data: leaveApplications, error } = await query;

      if (error) throw error;

      if (!leaveApplications || leaveApplications.length === 0) {
        setLeaveRequests([]);
        return;
      }

      // Get unique employee IDs, department IDs, role IDs, and leave category IDs
      const employeeIds = [...new Set(leaveApplications.map(app => app.employee_id))];
      const leaveCategoryIds = [...new Set(leaveApplications.map(app => app.leave_category_id).filter(Boolean))];

      // Fetch employees with their departments and roles
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select(`
          emp_id,
          first_name,
          last_name,
          username,
          department_id,
          role_id
        `)
        .in('emp_id', employeeIds);

      if (empError) throw empError;

      // Get unique department and role IDs from employees
      const departmentIds = [...new Set(employees?.map(emp => emp.department_id).filter(Boolean) || [])];
      const roleIds = [...new Set(employees?.map(emp => emp.role_id).filter(Boolean) || [])];

      // Fetch departments, roles, and leave categories
      const [deptResult, roleResult, categoryResult] = await Promise.all([
        departmentIds.length > 0 ? supabase.from('departments').select('dept_id, dept_name').in('dept_id', departmentIds) : { data: [], error: null },
        roleIds.length > 0 ? supabase.from('roles').select('role_id, role_name').in('role_id', roleIds) : { data: [], error: null },
        leaveCategoryIds.length > 0 ? supabase.from('leave_categories').select('id, name').in('id', leaveCategoryIds) : { data: [], error: null }
      ]);

      // Create lookup maps
      const employeeMap = new Map(employees?.map(emp => [emp.emp_id, emp]) || []);
      const deptMap = new Map(deptResult.data?.map(dept => [dept.dept_id, dept]) || []);
      const roleMap = new Map(roleResult.data?.map(role => [role.role_id, role]) || []);
      const categoryMap = new Map(categoryResult.data?.map(cat => [cat.id, cat]) || []);

      // Combine the data
      const processedData = leaveApplications.map(request => {
        const employee = employeeMap.get(request.employee_id);
        const department = employee?.department_id ? deptMap.get(employee.department_id) : null;
        const role = employee?.role_id ? roleMap.get(employee.role_id) : null;
        const category = request.leave_category_id ? categoryMap.get(request.leave_category_id) : null;

        return {
          ...request,
          employee: employee ? {
            first_name: employee.first_name,
            last_name: employee.last_name,
            username: employee.username,
            department_id: employee.department_id,
            role_id: employee.role_id
          } : null,
          department: department ? { dept_name: department.dept_name } : null,
          role: role ? { role_name: role.role_name } : null,
          leave_category: category ? { name: category.name } : null
        };
      });

      // Apply role-based filtering after data assembly
      let filteredData = processedData;
      
      if (isDeptHead && currentUser?.department_id) {
        // Department Head sees requests from their department
        filteredData = processedData.filter(request => {
          const employee = employeeMap.get(request.employee_id);
          return employee && employee.department_id === currentUser.department_id &&
            ['pending', 'dept_approved', 'dept_rejected'].includes(request.status);
        });
      } else if (isHR) {
        // HR sees requests that have been dept approved
        filteredData = processedData.filter(request => 
          ['dept_approved', 'approved', 'rejected'].includes(request.status)
        );
      }
      
      setLeaveRequests(filteredData);
    } catch (err: any) {
      console.error("Error fetching leave requests:", err);
      setError("Failed to load leave requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchLeaveRequests();
    }
  }, [currentUser, isDeptHead, isHR, isCXO]);

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode } } = {
      pending: { 
        label: "Pending Dept Review", 
        variant: "secondary",
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      dept_approved: { 
        label: "Pending HR Review", 
        variant: "outline",
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      dept_rejected: { 
        label: "Dept Rejected", 
        variant: "destructive",
        icon: <XCircle className="h-3 w-3 mr-1" />
      },
      approved: { 
        label: "Approved", 
        variant: "default",
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      },
      rejected: { 
        label: "Rejected", 
        variant: "destructive",
        icon: <XCircle className="h-3 w-3 mr-1" />
      }
    };
    
    const config = statusConfig[status] || { 
      label: "Unknown", 
      variant: "outline" as const,
      icon: <Clock className="h-3 w-3 mr-1" />
    };
    
    return (
      <Badge variant={config.variant} className="flex items-center">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const canReviewRequest = (request: LeaveRequest): boolean => {
    if (isDeptHead && request.status === 'pending') {
      // Dept head can review pending requests from their department
      return request.employee?.department_id === currentUser?.department_id;
    }
    if (isHR && request.status === 'dept_approved') {
      // HR can review dept approved requests
      return true;
    }
    return false;
  };

  const getActionButton = (request: LeaveRequest) => {
    if (!canReviewRequest(request)) {
      return (
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View Only
        </Button>
      );
    }

    return (
      <Button 
        onClick={() => {
          setSelectedLeave(request);
          setReviewDialogOpen(true);
        }}
        size="sm"
      >
        <Eye className="h-4 w-4 mr-2" />
        Review
      </Button>
    );
  };

  const getWorkflowInfo = (request: LeaveRequest) => {
    const employeeRole = request.role?.role_name;
    
    if (employeeRole === 'HR Manager') {
      return (
        <div className="text-xs text-muted-foreground">
          
        </div>
      );
    } else if (employeeRole === 'Department Head') {
      return (
        <div className="text-xs text-muted-foreground">
          
        </div>
      );
    } else {
      return (
        <div className="text-xs text-muted-foreground">
          
        </div>
      );
    }
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
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">
            {isDeptHead && "Review leave requests from your department"}
            {isHR && "Review department-approved leave requests"}
            {isCXO && "View all leave requests"}
            {!isDeptHead && !isHR && !isCXO && "Your leave requests"}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg">
            {error}
          </div>
        )}

        {leaveRequests.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No leave requests found.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {leaveRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {request.employee?.first_name} {request.employee?.last_name}
                    </CardTitle>
                    <CardDescription>
                      {request.employee?.username} • {request.department?.dept_name} • {request.role?.role_name}
                    </CardDescription>
                    {getWorkflowInfo(request)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(request.status)}
                    {getActionButton(request)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Leave Type</Label>
                    <p className="text-sm font-medium">{request.leave_category?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <p className="text-sm font-medium">{request.total_days} days</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <p className="text-sm font-medium">{new Date(request.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <p className="text-sm font-medium">{new Date(request.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Reason</Label>
                  <p className="text-sm bg-muted p-3 rounded-lg mt-1">{request.reason}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          leaveRequest={selectedLeave}
          onSuccess={fetchLeaveRequests}
          reviewerRole={isDeptHead ? 'Department Head' : 'HR Manager'}
        />
      </div>
    </HRMSLayout>
  );
};

export default LeaveManagement;