import { useState, useEffect } from 'react';
import HRMSLayout from "@/components/HRMSLayout";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import LeaveReviewDialog from '@/components/LeaveReviewDialog';
import { Badge } from '@/components/ui/badge';

interface LeaveRequest {
  leave_id: string;
  emp_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  employees: {
    first_name: string;
    last_name: string;
    username: string;
    departments: {
      dept_name: string;
    };
    roles: {
      role_name: string;
    };
  };
  leave_types: {
    leave_name: string;
  }
}

const TOP_LEVEL_ROLES = ['Department Head', 'HR Manager', 'CXO'];

const LeaveManagement = () => {
  const { employee } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const userRole = employee?.roles?.role_name;
  const isDeptHead = userRole === 'Department Head';
  const isHR = userRole === 'HR Manager' || userRole === 'CXO';

  const fetchLeaveRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employees!leave_requests_emp_id_fkey!inner(*, departments!employees_department_id_fkey!inner(dept_name), roles!role_id(role_name)),
        leave_types!inner(leave_name)
      `);

    if (isDeptHead) {
      if (employee?.department_id) {
        query = query.eq('employees.department_id', employee.department_id).eq('status', 'pending');
      } else {
        setRequests([]);
        setLoading(false);
        return;
      }
    } else if (isHR) {
      // HR fetches all requests, then filters in UI
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error("Failed to fetch leave requests", error);
    } else {
      setRequests(data as LeaveRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isDeptHead || isHR) {
      fetchLeaveRequests();
    }
  }, [isDeptHead, isHR, employee]);

  const handleReview = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsReviewOpen(true);
  };

  const getReviewType = () => {
    if (!selectedRequest) return 'hr';
    if (isHR && selectedRequest.status === 'dept_approved') return 'hr';
    // If HR is reviewing a pending request from a top-level role, they act as dept head
    if (isHR && selectedRequest.status === 'pending' && selectedRequest.employees.roles?.role_name && TOP_LEVEL_ROLES.includes(selectedRequest.employees.roles.role_name)) return 'hr';
    if (isDeptHead) return 'dept_head';
    return 'hr'; 
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "secondary" as const },
      dept_approved: { label: "Dept Approved", variant: "default" as const },
      approved: { label: "Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderRequestList = (reqs: LeaveRequest[], emptyMessage: string) => {
    if (loading) return <p>Loading...</p>;
    if (reqs.length === 0) return <p>{emptyMessage}</p>;

    return (
      <div className="space-y-4">
        {reqs.map(req => (
          <Card key={req.leave_id}>
            <CardHeader>
              <CardTitle>{req.employees.first_name} {req.employees.last_name}</CardTitle>
              <CardDescription>{req.leave_types.leave_name} - {req.total_days} day(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</p>
              <p className="text-sm text-muted-foreground mt-2">Reason: {req.reason}</p>
              <div className="flex items-center justify-between mt-4">
                {getStatusBadge(req.status)}
                {(isDeptHead && req.status === 'pending') || 
                 (isHR && (req.status === 'dept_approved' || 
                           (req.status === 'pending' && req.employees.roles?.role_name && TOP_LEVEL_ROLES.includes(req.employees.roles.role_name)))) ? (
                  <Button size="sm" onClick={() => handleReview(req)}>Review</Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const deptPendingRequests = requests.filter(r => r.status === 'pending' && r.employees.departments.dept_name === employee?.departments?.dept_name);
  const hrPendingRequests = requests.filter(r => r.status === 'dept_approved' || (r.status === 'pending' && r.employees.roles?.role_name && TOP_LEVEL_ROLES.includes(r.employees.roles.role_name)));
  const allRequests = requests;

  return (
    <HRMSLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Review and process employee leave requests.</p>
        </div>

        <Tabs defaultValue={isDeptHead ? "department" : "hr"} className="w-full">
          <TabsList>
            {isDeptHead && <TabsTrigger value="department">Pending Dept. Approval</TabsTrigger>}
            {isHR && <TabsTrigger value="hr">Pending HR Approval</TabsTrigger>}
            {isHR && <TabsTrigger value="all">All Requests</TabsTrigger>}
          </TabsList>
          {isDeptHead && (
            <TabsContent value="department">
              <p className="text-sm text-muted-foreground mb-4">Requests from your department awaiting your approval.</p>
              {renderRequestList(deptPendingRequests, "No pending requests for your department.")}
            </TabsContent>
          )}
          {isHR && (
            <TabsContent value="hr">
              <p className="text-sm text-muted-foreground mb-4">Requests approved by Department Heads, or submitted by top-level roles, awaiting HR approval.</p>
              {renderRequestList(hrPendingRequests, "No requests pending HR approval.")}
            </TabsContent>
          )}
          {isHR && (
            <TabsContent value="all">
              <p className="text-sm text-muted-foreground mb-4">All leave requests in the system.</p>
              {renderRequestList(allRequests, "No other requests found.")}
            </TabsContent>
          )}
        </Tabs>
      </div>
      {selectedRequest && (
        <LeaveReviewDialog 
          open={isReviewOpen}
          onOpenChange={setIsReviewOpen}
          leaveRequest={selectedRequest}
          onSuccess={fetchLeaveRequests}
          reviewType={getReviewType()}
        />
      )}
    </HRMSLayout>
  );
};

export default LeaveManagement;
